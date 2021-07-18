import { ClampToEdgeWrapping, DoubleSide, FrontSide, LinearEncoding, LinearFilter, LinearMipmapLinearFilter, LinearMipmapNearestFilter, Material, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, MirroredRepeatWrapping, NearestFilter, NearestMipmapLinearFilter, NearestMipmapNearestFilter, RepeatWrapping, Texture, TextureEncoding, TextureFilter, Wrapping, sRGBEncoding } from 'three';
import { Material as MaterialDef, Texture as TextureDef, TextureInfo as TextureInfoDef, vec3 } from '@gltf-transform/core';
import { Clearcoat, Transmission } from '@gltf-transform/extensions';
import type { UpdateContext } from '../UpdateContext';
import { PropertyObserver, Subscription } from '../observers';
import { eq } from '../utils';
import { Binding } from './Binding';

const _vec3: vec3 = [0, 0, 0];

const WEBGL_FILTERS: Record<number, TextureFilter> = {
	9728: NearestFilter,
	9729: LinearFilter,
	9984: NearestMipmapNearestFilter,
	9985: LinearMipmapNearestFilter,
	9986: NearestMipmapLinearFilter,
	9987: LinearMipmapLinearFilter
};

const WEBGL_WRAPPINGS: Record<number, Wrapping> = {
	33071: ClampToEdgeWrapping,
	33648: MirroredRepeatWrapping,
	10497: RepeatWrapping
};

enum ShadingModel {
	UNLIT = 0,
	STANDARD = 1,
	PHYSICAL = 2,
}

export class MaterialBinding extends Binding<MaterialDef, Material> {
	protected baseColorTexture = new PropertyObserver<TextureDef, Texture>(this._context);
	protected emissiveTexture = new PropertyObserver<TextureDef, Texture>(this._context);
	protected normalTexture = new PropertyObserver<TextureDef, Texture>(this._context);
	protected occlusionTexture = new PropertyObserver<TextureDef, Texture>(this._context);
	protected metallicRoughnessTexture = new PropertyObserver<TextureDef, Texture>(this._context);

	protected clearcoatTexture = new PropertyObserver<TextureDef, Texture>(this._context);
	protected clearcoatRoughnessTexture = new PropertyObserver<TextureDef, Texture>(this._context);
	protected clearcoatNormalTexture = new PropertyObserver<TextureDef, Texture>(this._context);

	protected transmissionTexture = new PropertyObserver<TextureDef, Texture>(this._context);

	public constructor(context: UpdateContext, source: MaterialDef) {
		super(context, source, MaterialBinding.createTarget(source));

		this.bindTexture(['map'], this.baseColorTexture, () => source.getBaseColorTextureInfo(), sRGBEncoding);
		this.bindTexture(['emissiveMap'], this.emissiveTexture, () => source.getEmissiveTextureInfo(), sRGBEncoding);
		this.bindTexture(['normalMap'], this.normalTexture, () => source.getNormalTextureInfo(), LinearEncoding);
		this.bindTexture(['aoMap'], this.occlusionTexture, () => source.getOcclusionTextureInfo(), LinearEncoding);
		this.bindTexture(['roughnessMap', 'metalnessMap'], this.metallicRoughnessTexture, () => source.getMetallicRoughnessTextureInfo(), LinearEncoding);

		// KHR_materials_clearcoat
		const clearcoatExt = (): Clearcoat | null => source.getExtension<Clearcoat>('KHR_materials_clearcoat');
		this.bindTexture(['clearcoatMap'], this.clearcoatTexture, () => clearcoatExt()?.getClearcoatTextureInfo(), LinearEncoding);
		this.bindTexture(['clearcoatRoughnessMap'], this.clearcoatRoughnessTexture, () => clearcoatExt()?.getClearcoatRoughnessTextureInfo(), LinearEncoding);
		this.bindTexture(['clearcoatNormalMap'], this.clearcoatNormalTexture, () => clearcoatExt()?.getClearcoatNormalTextureInfo(), LinearEncoding);

		// KHR_materials_transmission
		const transmissionExt = (): Transmission | null => source.getExtension<Transmission>('KHR_materials_transmission');
		this.bindTexture(['transmissionMap'], this.transmissionTexture, () => transmissionExt()?.getTransmissionTextureInfo(), LinearEncoding);
	}

	private bindTexture(
			maps: string[],
			observer: PropertyObserver<TextureDef, Texture>,
			textureInfoFn: () => TextureInfoDef | undefined | null,
			encoding: TextureEncoding): Subscription {
		return observer.subscribe((texture) => {
			const material = this.value as any;
			texture = texture ? this.configureTexture(texture, textureInfoFn()!, encoding) : null;
			for (const map of maps) {
				if (material[map] && material[map] !== texture) material[map].dispose();
				material[map] = texture;
			}
		});
	}

	private static createTarget(source: MaterialDef): Material {
		const shadingModel = this.getShadingModel(source);
		switch (shadingModel) {
			case ShadingModel.UNLIT:
				return new MeshBasicMaterial();
			case ShadingModel.STANDARD:
				return new MeshStandardMaterial();
			case ShadingModel.PHYSICAL:
				// TODO(https://github.com/three-types/three-ts-types/pull/106)
				return new MeshPhysicalMaterial({});
			default:
				throw new Error('Unsupported shading model.');
		}
	}

	/**
	 * Manually re-attach all textures. Required when re-constructing the
	 * Material class for a shading model change.
	 * TODO(cleanup): Try to handle this a simpler way.
	 */
	private updateTargetTextures(target: MeshBasicMaterial | MeshStandardMaterial | MeshPhysicalMaterial) {
		if (this.baseColorTexture) target.map = this.baseColorTexture.value;

		if (!(target instanceof MeshStandardMaterial)) return;

		if (this.emissiveTexture) target.emissiveMap = this.emissiveTexture.value;
		if (this.normalTexture) target.normalMap = this.normalTexture.value;
		if (this.occlusionTexture) target.aoMap = this.occlusionTexture.value;
		if (this.metallicRoughnessTexture) {
			target.metalnessMap = target.roughnessMap = this.metallicRoughnessTexture.value;
		}

		if (!(target instanceof MeshPhysicalMaterial)) return;

		if (this.clearcoatTexture) target.clearcoatMap = this.clearcoatTexture.value;
		if (this.clearcoatRoughnessTexture) target.clearcoatRoughnessMap = this.clearcoatRoughnessTexture.value;
		if (this.clearcoatNormalTexture) target.clearcoatNormalMap = this.clearcoatNormalTexture.value;
		if (this.transmissionTexture) target.transmissionMap = this.transmissionTexture.value;
	}

	private static getShadingModel(source: MaterialDef): ShadingModel {
		for (const extension of source.listExtensions()) {
			switch (extension.extensionName) {
				case 'KHR_materials_unlit':
					return ShadingModel.UNLIT;
				case 'KHR_materials_clearcoat':
				case 'KHR_materials_transmission':
					return ShadingModel.PHYSICAL;
			}
		}
		return ShadingModel.STANDARD;
	}

	public update(): this {
		const source = this.source;
		let target = this.value;

		const shadingModel = MaterialBinding.getShadingModel(source);
		if (shadingModel === ShadingModel.UNLIT && !(target instanceof MeshBasicMaterial)
			|| shadingModel === ShadingModel.STANDARD && !(target instanceof MeshStandardMaterial)
			|| shadingModel === ShadingModel.PHYSICAL && !(target instanceof MeshPhysicalMaterial)) {
			const nextTarget = MaterialBinding.createTarget(source);
			this.updateTargetTextures(nextTarget as unknown as MeshStandardMaterial);
			this.next(nextTarget);
			this.disposeTarget(target);
			target = this.value;
		}

		// TODO(testing): Test some of the edge cases here. When switching from
		// 'standard' to 'unlit' model, do unwanted properties like AO get
		// set on the MeshBasicMaterial?
		switch (shadingModel) {
			case ShadingModel.STANDARD:
			case ShadingModel.PHYSICAL:
				this.updatePhysical();
				this.updateStandard();
				// ⬇ falls through.
			default:
				this.updateCommon();
		}

		return this;
	}

	public updateCommon() {
		const source = this.source;
		const target = this.value as MeshBasicMaterial;

		if (source.getName() !== target.name) {
			target.name = source.getName();
		}

		if (source.getDoubleSided() !== (target.side === DoubleSide)) {
			target.side = source.getDoubleSided() ? DoubleSide : FrontSide;
		}

		switch (source.getAlphaMode()) {
			case 'OPAQUE':
				target.transparent = false;
				target.depthWrite = true;
				target.alphaTest = 0;
				break;
			case 'BLEND':
				target.transparent = true;
				target.depthWrite = false;
				target.alphaTest = 0;
				break;
			case 'MASK':
				target.transparent = false;
				target.depthWrite = true;
				target.alphaTest = source.getAlphaCutoff();
				break;
		}

		const sourceBaseColor = source.getBaseColorFactor() as number[];
		sourceBaseColor.length = 3;
		if (!eq(sourceBaseColor, target.color.toArray(_vec3))) {
			target.color.fromArray(sourceBaseColor);
		}

		const sourceAlpha = source.getAlpha();
		if (sourceAlpha !== target.opacity) {
			target.opacity = sourceAlpha;
		}
	}

	public updateStandard() {
		const source = this.source;
		const target = this.value as MeshStandardMaterial;

		const sourceEmissive = source.getEmissiveFactor();
		if (!eq(sourceEmissive, target.emissive.toArray(_vec3))) {
			target.emissive.fromArray(sourceEmissive);
		}

		const sourceRoughness = source.getRoughnessFactor();
		if (sourceRoughness !== target.roughness) {
			target.roughness = sourceRoughness;
		}

		const sourceMetalness = source.getMetallicFactor();
		if (sourceMetalness !== target.metalness) {
			target.metalness = sourceMetalness;
		}

		const sourceOcclusionStrength = source.getOcclusionStrength();
		if (sourceOcclusionStrength !== target.aoMapIntensity) {
			target.aoMapIntensity = sourceOcclusionStrength;
		}

		const sourceNormalScale = source.getNormalScale();
		if (sourceNormalScale !== target.normalScale.x) {
			// TODO(bug): Different fix required with vertex tangents...
			// https://github.com/mrdoob/three.js/issues/11438#issuecomment-507003995
			target.normalScale.x = sourceNormalScale;
			target.normalScale.y = - sourceNormalScale;
		}

		this.baseColorTexture.update(source.getBaseColorTexture());
		this.emissiveTexture.update(source.getEmissiveTexture());
		this.normalTexture.update(source.getNormalTexture());
		this.occlusionTexture.update(source.getOcclusionTexture());
		this.metallicRoughnessTexture.update(source.getMetallicRoughnessTexture());
	}

	public updatePhysical() {
		const source = this.source;
		const target = this.value as MeshPhysicalMaterial;

		// KHR_materials_clearcoat
		const clearcoat = source.getExtension<Clearcoat>('KHR_materials_clearcoat');
		if (clearcoat) {
			if (clearcoat.getClearcoatFactor() !== target.clearcoat) {
				target.clearcoat = clearcoat.getClearcoatFactor();
			}
			if (clearcoat.getClearcoatRoughnessFactor() !== target.clearcoatRoughness) {
				target.clearcoatRoughness = clearcoat.getClearcoatRoughnessFactor();
			}
			if (clearcoat.getClearcoatNormalScale() !== target.clearcoatNormalScale.x) {
				target.clearcoatNormalScale.x = clearcoat.getClearcoatNormalScale();
				target.clearcoatNormalScale.y = - clearcoat.getClearcoatNormalScale();
			}
			this.clearcoatTexture.update(clearcoat.getClearcoatTexture());
			this.clearcoatRoughnessTexture.update(clearcoat.getClearcoatRoughnessTexture());
			this.clearcoatNormalTexture.update(clearcoat.getClearcoatNormalTexture());
		} else {
			target.clearcoat = 0;
		}

		// KHR_materials_transmission
		const transmission = source.getExtension<Transmission>('KHR_materials_transmission');
		if (transmission) {
			if (transmission.getTransmissionFactor() !== target.transmission) {
				target.transmission = transmission.getTransmissionFactor();
			}
			this.transmissionTexture.update(transmission.getTransmissionTexture());
		} else {
			target.transmission = 0;
		}
	}

	public configureTexture(texture: Texture, textureInfo: TextureInfoDef, encoding: TextureEncoding): Texture {
		// TODO(bug): Make a copy if needed...
		// TODO(bug): Dispose the copy (not just deref it!) if no longer needed...
		texture.minFilter = WEBGL_FILTERS[textureInfo.getMinFilter() as number] || LinearMipmapLinearFilter;
		texture.magFilter = WEBGL_FILTERS[textureInfo.getMagFilter() as number] || LinearFilter;
		texture.wrapS = WEBGL_WRAPPINGS[textureInfo.getWrapS()] || RepeatWrapping;
		texture.wrapT = WEBGL_WRAPPINGS[textureInfo.getWrapT()] || RepeatWrapping;
		texture.encoding = encoding;
		texture.needsUpdate = true;
		return texture;
	}

	public disposeTarget(target: Material): void {
		target.dispose();
	}

	public dispose() {
		this.baseColorTexture.dispose();
		this.emissiveTexture.dispose();
		this.normalTexture.dispose();
		this.occlusionTexture.dispose();
		this.metallicRoughnessTexture.dispose();

		super.dispose();
	}
}
