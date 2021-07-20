import { DoubleSide, FrontSide, LinearEncoding, Material, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, Texture, TextureEncoding, sRGBEncoding } from 'three';
import { Material as MaterialDef, Texture as TextureDef, TextureInfo as TextureInfoDef, vec3 } from '@gltf-transform/core';
import { Clearcoat, IOR, Transmission } from '@gltf-transform/extensions';
import type { UpdateContext } from '../UpdateContext';
import { PropertyObserver, Subscription } from '../observers';
import { eq } from '../utils';
import { Binding } from './Binding';
import { createTextureCache, createTextureParams } from 'VariantCache';

const _vec3: vec3 = [0, 0, 0];

enum ShadingModel {
	UNLIT = 0,
	STANDARD = 1,
	PHYSICAL = 2,
}

export class MaterialBinding extends Binding<MaterialDef, Material> {
	protected readonly baseColorTexture = new PropertyObserver<TextureDef, Texture>(this._context);
	protected readonly emissiveTexture = new PropertyObserver<TextureDef, Texture>(this._context);
	protected readonly normalTexture = new PropertyObserver<TextureDef, Texture>(this._context);
	protected readonly occlusionTexture = new PropertyObserver<TextureDef, Texture>(this._context);
	protected readonly metallicRoughnessTexture = new PropertyObserver<TextureDef, Texture>(this._context);

	protected readonly clearcoatTexture = new PropertyObserver<TextureDef, Texture>(this._context);
	protected readonly clearcoatRoughnessTexture = new PropertyObserver<TextureDef, Texture>(this._context);
	protected readonly clearcoatNormalTexture = new PropertyObserver<TextureDef, Texture>(this._context);

	protected readonly transmissionTexture = new PropertyObserver<TextureDef, Texture>(this._context);

	private readonly _textureObservers: PropertyObserver<TextureDef, Texture>[] = [];

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
		this._textureObservers.push(observer);
		return observer.subscribe((texture) => {
			// Configure Texture from TextureInfo.
			if (texture) {
				const textureParams = createTextureParams(textureInfoFn()!, encoding);
				texture = this._context.textureCache.request(texture, textureParams);
			}

			// Assign new Texture.
			const material = this.value as any;
			for (const map of maps) {
				// Unlit ⊂ Standard ⊂ Physical
				if (!(map in material)) continue;

				// Recompile materials if texture added/removed.
				if (!!material[map] !== !!texture) material.needsUpdate = true;

				// Return old textures to cache.
				// TODO(bug): Should this be === or !==, or both?
				if (material[map] && material[map] !== texture) {
					this._context.textureCache.release(material[map]);
				}

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
		const shadingModel = this.getShadingModel(source);
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

	private static getShadingModel(source: MaterialDef): ShadingModel {
		// TODO(bug): This is called 2-3 times during loadout, is that OK?
		console.log('MaterialBinding::getShadingModel → ' + source.listExtensions().map((e) => e.extensionName).join());
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

	public update(): this {
		const source = this.source;
		let target = this.value;

		const shadingModel = MaterialBinding.getShadingModel(source);
		if (shadingModel === ShadingModel.UNLIT && target.type !== 'MeshBasicMaterial'
			|| shadingModel === ShadingModel.STANDARD && target.type !== 'MeshStandardMaterial'
			|| shadingModel === ShadingModel.PHYSICAL && target.type !== 'MeshPhysicalMaterial') {
			this.next(MaterialBinding.createTarget(source));
			this.applyBoundTextures();
			this.disposeTarget(target);
			target = this.value;

			console.debug(`MaterialBinding::shadingModel → ${target.type}`);
		}

		// TODO(bug): Test some of the edge cases here. When switching from
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

		const sourceBaseColor = source.getBaseColorFactor().slice(0, 3);
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
			this.clearcoatTexture.update(clearcoat.getClearcoatTexture());
			this.clearcoatRoughnessTexture.update(clearcoat.getClearcoatRoughnessTexture());
			this.clearcoatNormalTexture.update(clearcoat.getClearcoatNormalTexture());
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
			this.transmissionTexture.update(transmission.getTransmissionTexture());
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
