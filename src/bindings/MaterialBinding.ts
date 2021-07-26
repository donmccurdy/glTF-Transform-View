import { DoubleSide, FrontSide, LinearEncoding, Material, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, Texture, TextureEncoding, sRGBEncoding, LineBasicMaterial, PointsMaterial } from 'three';
import { Material as MaterialDef, Texture as TextureDef, TextureInfo as TextureInfoDef, vec3 } from '@gltf-transform/core';
import { Clearcoat, IOR, Transmission } from '@gltf-transform/extensions';
import type { UpdateContext } from '../UpdateContext';
import { Subscription } from '../observers';
import { eq } from '../utils';
import { Binding } from './Binding';
import { createTextureParams, createTextureVariant, TextureParams } from '../variants/texture';
import { PropertyVariantObserver } from '../observers/PropertyVariantObserver';

const _vec3: vec3 = [0, 0, 0];

enum ShadingModel {
	UNLIT = 0,
	STANDARD = 1,
	PHYSICAL = 2,
}

export class MaterialBinding extends Binding<MaterialDef, Material> {
	protected readonly baseColorTexture = new PropertyVariantObserver<TextureDef, Texture, TextureParams>(this._context, createTextureVariant);
	protected readonly emissiveTexture = new PropertyVariantObserver<TextureDef, Texture, TextureParams>(this._context, createTextureVariant);
	protected readonly normalTexture = new PropertyVariantObserver<TextureDef, Texture, TextureParams>(this._context, createTextureVariant);
	protected readonly occlusionTexture = new PropertyVariantObserver<TextureDef, Texture, TextureParams>(this._context, createTextureVariant);
	protected readonly metallicRoughnessTexture = new PropertyVariantObserver<TextureDef, Texture, TextureParams>(this._context, createTextureVariant);

	protected readonly clearcoatTexture = new PropertyVariantObserver<TextureDef, Texture, TextureParams>(this._context, createTextureVariant);
	protected readonly clearcoatRoughnessTexture = new PropertyVariantObserver<TextureDef, Texture, TextureParams>(this._context, createTextureVariant);
	protected readonly clearcoatNormalTexture = new PropertyVariantObserver<TextureDef, Texture, TextureParams>(this._context, createTextureVariant);

	protected readonly transmissionTexture = new PropertyVariantObserver<TextureDef, Texture, TextureParams>(this._context, createTextureVariant);

	private readonly _textureObservers: PropertyVariantObserver<TextureDef, Texture, TextureParams>[] = [];
	private readonly _textureUpdateFns: (() => void)[] = [];

	public constructor(context: UpdateContext, source: MaterialDef) {
		super(context, source, MaterialBinding.createTarget(source));

		this.bindTexture(['map'], this.baseColorTexture, () => source.getBaseColorTexture(), () => source.getBaseColorTextureInfo(), sRGBEncoding);
		this.bindTexture(['emissiveMap'], this.emissiveTexture, () => source.getEmissiveTexture(), () => source.getEmissiveTextureInfo(), sRGBEncoding);
		this.bindTexture(['normalMap'], this.normalTexture, () => source.getNormalTexture(), () => source.getNormalTextureInfo(), LinearEncoding);
		this.bindTexture(['aoMap'], this.occlusionTexture, () => source.getOcclusionTexture(), () => source.getOcclusionTextureInfo(), LinearEncoding);
		this.bindTexture(['roughnessMap', 'metalnessMap'], this.metallicRoughnessTexture, () => source.getMetallicRoughnessTexture(), () => source.getMetallicRoughnessTextureInfo(), LinearEncoding);

		// KHR_materials_clearcoat
		const clearcoatExt = (): Clearcoat | null => source.getExtension<Clearcoat>('KHR_materials_clearcoat');
		this.bindTexture(['clearcoatMap'], this.clearcoatTexture, () => clearcoatExt()?.getClearcoatTexture() || null, () => clearcoatExt()?.getClearcoatTextureInfo() || null, LinearEncoding);
		this.bindTexture(['clearcoatRoughnessMap'], this.clearcoatRoughnessTexture, () => clearcoatExt()?.getClearcoatRoughnessTexture() || null, () => clearcoatExt()?.getClearcoatRoughnessTextureInfo() || null, LinearEncoding);
		this.bindTexture(['clearcoatNormalMap'], this.clearcoatNormalTexture, () => clearcoatExt()?.getClearcoatNormalTexture() || null, () => clearcoatExt()?.getClearcoatNormalTextureInfo() || null, LinearEncoding);

		// KHR_materials_transmission
		const transmissionExt = (): Transmission | null => source.getExtension<Transmission>('KHR_materials_transmission');
		this.bindTexture(['transmissionMap'], this.transmissionTexture, () => transmissionExt()?.getTransmissionTexture() || null, () => transmissionExt()?.getTransmissionTextureInfo() || null, LinearEncoding);
	}

	private bindTexture(
			maps: string[],
			observer: PropertyVariantObserver<TextureDef, Texture, TextureParams>,
			textureFn: () => TextureDef | null,
			textureInfoFn: () => TextureInfoDef | null,
			encoding: TextureEncoding): Subscription {

		this._textureObservers.push(observer);

		this._textureUpdateFns.push(() => {
			const textureInfo = textureInfoFn();
			if (textureInfo) observer.setParams(createTextureParams(textureInfo, encoding));
			observer.update(textureFn());
		})

		return observer.subscribe((texture) => {
			const material = this.value as any;
			for (const map of maps) {
				if (!(map in material)) continue; // Unlit ⊂ Standard ⊂ Physical (& Points, Lines)
				if (!!material[map] !== !!texture) material.needsUpdate = true; // Recompile on add/remove.
				material[map] = texture;
			}
		});
	}

	private applyBoundTextures() {
		for (const observer of this._textureObservers) {
			observer.notify();
		}
	}

	private static createTarget(source: MaterialDef): Material {
		const shadingModel = getShadingModel(source);
		switch (shadingModel) {
			case ShadingModel.UNLIT:
				return new MeshBasicMaterial();
			case ShadingModel.STANDARD:
				return new MeshStandardMaterial();
			case ShadingModel.PHYSICAL:
				// TODO(cleanup): https://github.com/three-types/three-ts-types/pull/106
				return new MeshPhysicalMaterial({});
			default:
				throw new Error('Unsupported shading model.');
		}
	}

	public update(): this {
		const source = this.source;
		let target = this.value;

		const shadingModel = getShadingModel(source);
		if (shadingModel === ShadingModel.UNLIT && target.type !== 'MeshBasicMaterial'
			|| shadingModel === ShadingModel.STANDARD && target.type !== 'MeshStandardMaterial'
			|| shadingModel === ShadingModel.PHYSICAL && target.type !== 'MeshPhysicalMaterial') {
			this.next(MaterialBinding.createTarget(source));
			this.applyBoundTextures();
			this.disposeTarget(target);
			target = this.value;

			console.debug(`MaterialBinding::shadingModel → ${target.type}`);
		}

		// TODO(test): Write tests for the edge cases here, ensure that we
		// don't get properties on a material from the wrong shading model.
		switch (shadingModel) {
			case ShadingModel.PHYSICAL:
				this._updatePhysical(target as MeshPhysicalMaterial); // falls through ⬇
			case ShadingModel.STANDARD:
				this._updateStandard(target as MeshStandardMaterial); // falls through ⬇
			default:
				this._updateBasic(target as MeshBasicMaterial);
		}

		for (const fn of this._textureUpdateFns) fn();

		// TODO(impl): How difficult would it be to put this behind a needsUpdate test?
		this.notify(); // Notify PropertyVariantObserver.

		return this;
	}

	private _updateBasic(target: MeshBasicMaterial) {
		const source = this.source;

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

		const sourceAlpha = source.getAlpha();
		if (sourceAlpha !== target.opacity) {
			target.opacity = sourceAlpha;
		}

		const sourceBaseColor = source.getBaseColorFactor().slice(0, 3);
		if (!eq(sourceBaseColor, target.color.toArray(_vec3))) {
			target.color.fromArray(sourceBaseColor);
		}
	}

	private _updateStandard(target: MeshStandardMaterial) {
		const source = this.source;

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
			target.normalScale.setScalar(sourceNormalScale);
		}
	}

	private _updatePhysical(target: MeshPhysicalMaterial) {
		const source = this.source;

		if (!(target instanceof MeshPhysicalMaterial)) {
			return;
		}

		// KHR_materials_clearcoat
		const clearcoat = source.getExtension<Clearcoat>('KHR_materials_clearcoat');
		if (clearcoat) {
			if (clearcoat.getClearcoatFactor() !== target.clearcoat) {
				if (target.clearcoat === 0) target.needsUpdate = true;
				target.clearcoat = clearcoat.getClearcoatFactor();
			}
			if (clearcoat.getClearcoatRoughnessFactor() !== target.clearcoatRoughness) {
				target.clearcoatRoughness = clearcoat.getClearcoatRoughnessFactor();
			}
			if (clearcoat.getClearcoatNormalScale() !== target.clearcoatNormalScale.x) {
				target.clearcoatNormalScale.x = clearcoat.getClearcoatNormalScale();
				target.clearcoatNormalScale.y = - clearcoat.getClearcoatNormalScale();
			}
		} else {
			target.clearcoat = 0;
		}

		// KHR_materials_ior
		const ior = source.getExtension<IOR>('KHR_materials_ior');
		if (ior) {
			if (ior.getIOR() !== target.ior) {
				target.ior = ior.getIOR();
			}
		} else {
			target.transmission = 0;
		}

		// KHR_materials_transmission
		const transmission = source.getExtension<Transmission>('KHR_materials_transmission');
		if (transmission) {
			if (transmission.getTransmissionFactor() !== target.transmission) {
				if (target.transmission === 0) target.needsUpdate = true;
				target.transmission = transmission.getTransmissionFactor();
			}
		} else {
			target.transmission = 0;
		}
	}

	public disposeTarget(target: Material): void {
		target.dispose();
	}

	public dispose() {
		for (const observer of this._textureObservers) {
			observer.dispose();
		}
		super.dispose();
	}
}

function getShadingModel(source: MaterialDef): ShadingModel {
	// TODO(bug): This is called 2-3 times during loadout, is that OK?
	console.log('MaterialBinding::getShadingModel()');

	for (const extension of source.listExtensions()) {
		if (extension.extensionName === 'KHR_materials_unlit') {
			return ShadingModel.UNLIT;
		}
	}
	for (const extension of source.listExtensions()) {
		switch (extension.extensionName) {
			case 'KHR_materials_unlit':
			case 'KHR_materials_clearcoat':
			case 'KHR_materials_ior':
			case 'KHR_materials_sheen':
			case 'KHR_materials_specular':
			case 'KHR_materials_transmission':
			case 'KHR_materials_volume':
				return ShadingModel.PHYSICAL;
		}
	}
	return ShadingModel.STANDARD;
}