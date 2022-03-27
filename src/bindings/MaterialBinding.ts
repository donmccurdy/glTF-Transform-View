import { DoubleSide, FrontSide, LinearEncoding, Material, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, Texture, TextureEncoding, sRGBEncoding, MathUtils } from 'three';
import { Material as MaterialDef, Texture as TextureDef, TextureInfo as TextureInfoDef, vec3 } from '@gltf-transform/core';
import type { Clearcoat, IOR, Sheen, Specular, Transmission, Volume } from '@gltf-transform/extensions';
import type { UpdateContext } from '../UpdateContext';
import { eq } from '../utils';
import { Binding } from './Binding';
import { TextureMap } from '../maps';
import { Observer } from '../observers';
import { pool } from '../ObjectPool';
import type { TextureBinding } from './TextureBinding';
import { Subscription } from '../EventDispatcher';

const _vec3: vec3 = [0, 0, 0];

enum ShadingModel {
	UNLIT = 0,
	STANDARD = 1,
	PHYSICAL = 2,
}

export class MaterialBinding extends Binding<MaterialDef, Material> {
	protected readonly baseColorTexture = new Observer<TextureDef, TextureBinding, Texture>('baseColorTexture', this._context);
	protected readonly emissiveTexture = new Observer<TextureDef, TextureBinding, Texture>('emissiveTexture', this._context);
	protected readonly normalTexture = new Observer<TextureDef, TextureBinding, Texture>('normalTexture', this._context);
	protected readonly occlusionTexture = new Observer<TextureDef, TextureBinding, Texture>('occlusionTexture', this._context);
	protected readonly metallicRoughnessTexture = new Observer<TextureDef, TextureBinding, Texture>('metallicRoughnessTexture', this._context);

	// KHR_materials_clearcoat
	protected readonly clearcoatTexture = new Observer<TextureDef, TextureBinding, Texture>('clearcoatTexture', this._context);
	protected readonly clearcoatRoughnessTexture = new Observer<TextureDef, TextureBinding, Texture>('clearcoatRoughnessTexture', this._context);
	protected readonly clearcoatNormalTexture = new Observer<TextureDef, TextureBinding, Texture>('clearcoatNormalTexture', this._context);

	// KHR_materials_sheen
	protected readonly sheenColorTexture = new Observer<TextureDef, TextureBinding, Texture>('sheenColorTexture', this._context);
	protected readonly sheenRoughnessTexture = new Observer<TextureDef, TextureBinding, Texture>('sheenRoughnessTexture', this._context);

	// KHR_materials_specular
	protected readonly specularTexture = new Observer<TextureDef, TextureBinding, Texture>('specularTexture', this._context);
	protected readonly specularColorTexture = new Observer<TextureDef, TextureBinding, Texture>('specularColorTexture', this._context);

	// KHR_materials_transmission
	protected readonly transmissionTexture = new Observer<TextureDef, TextureBinding, Texture>('transmissionTexture', this._context);

	// KHR_materials_volume
	protected readonly thicknessTexture = new Observer<TextureDef, TextureBinding, Texture>('thicknessTexture', this._context);

	private readonly _textureObservers: Observer<TextureDef, TextureBinding, Texture>[] = [];
	private readonly _textureUpdateFns: (() => void)[] = [];

	public constructor(context: UpdateContext, source: MaterialDef) {
		super(context, source, MaterialBinding.createValue(source));

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

		// KHR_materials_sheen
		const sheenExt = (): Sheen | null => source.getExtension<Sheen>('KHR_materials_sheen');
		this.bindTexture(['sheenColorMap'], this.sheenColorTexture, () => sheenExt()?.getSheenColorTexture() || null, () => sheenExt()?.getSheenColorTextureInfo() || null, sRGBEncoding);
		this.bindTexture(['sheenRoughnessMap'], this.sheenRoughnessTexture, () => sheenExt()?.getSheenRoughnessTexture() || null, () => sheenExt()?.getSheenRoughnessTextureInfo() || null, LinearEncoding);

		// KHR_materials_specular
		const specularExt = (): Specular | null => source.getExtension<Specular>('KHR_materials_specular');
		this.bindTexture(['specularIntensityMap'], this.specularTexture, () => specularExt()?.getSpecularTexture() || null, () => specularExt()?.getSpecularTextureInfo() || null, LinearEncoding);
		this.bindTexture(['specularColorMap'], this.specularColorTexture, () => specularExt()?.getSpecularColorTexture() || null, () => specularExt()?.getSpecularColorTextureInfo() || null, sRGBEncoding);

		// KHR_materials_transmission
		const transmissionExt = (): Transmission | null => source.getExtension<Transmission>('KHR_materials_transmission');
		this.bindTexture(['transmissionMap'], this.transmissionTexture, () => transmissionExt()?.getTransmissionTexture() || null, () => transmissionExt()?.getTransmissionTextureInfo() || null, LinearEncoding);

		// KHR_materials_volume
		const volumeExt = (): Volume | null => source.getExtension<Volume>('KHR_materials_volume');
		this.bindTexture(['thicknessMap'], this.thicknessTexture, () => volumeExt()?.getThicknessTexture() || null, () => volumeExt()?.getThicknessTextureInfo() || null, LinearEncoding);
	}

	private bindTexture(
			maps: string[],
			observer: Observer<TextureDef, TextureBinding, Texture>,
			textureFn: () => TextureDef | null,
			textureInfoFn: () => TextureInfoDef | null,
			encoding: TextureEncoding): Subscription {

		observer.updateParams(TextureMap.createParams(textureInfoFn()!, encoding) as unknown as Record<string, unknown>);

		this._textureObservers.push(observer);

		this._textureUpdateFns.push(() => {
			observer.updateSource(textureFn());
		})

		return observer.subscribe((texture) => {
			const material = this.value as any;
			for (const map of maps) {
				if (!(map in material)) continue; // Unlit ⊂ Standard ⊂ Physical (& Points, Lines)
				// TODO(bug): When shading model changes, we re-allocate all textures. Why?
				if (!!material[map] !== !!texture) material.needsUpdate = true; // Recompile on add/remove.
				material[map] = texture;
			}
			this.publishAll();
		});
	}

	private applyBoundTextures() {
		// TODO(bug): When shading model changes, we re-allocate all textures. Why?
		// for (const observer of this._textureObservers) {
		// 	observer.notify();
		// }
	}

	private static createValue(source: MaterialDef): Material {
		const shadingModel = getShadingModel(source);
		switch (shadingModel) {
			case ShadingModel.UNLIT:
				return pool.request(new MeshBasicMaterial());
			case ShadingModel.STANDARD:
				return pool.request(new MeshStandardMaterial());
			case ShadingModel.PHYSICAL:
				return pool.request(new MeshPhysicalMaterial());
			default:
				throw new Error('Unsupported shading model.');
		}
	}

	public update(): this {
		const source = this.def;
		let value = this.value;

		console.log('MaterialBinding::update');

		const shadingModel = getShadingModel(source);
		if (shadingModel === ShadingModel.UNLIT && value.type !== 'MeshBasicMaterial'
			|| shadingModel === ShadingModel.STANDARD && value.type !== 'MeshStandardMaterial'
			|| shadingModel === ShadingModel.PHYSICAL && value.type !== 'MeshPhysicalMaterial') {
			this.value = MaterialBinding.createValue(source);
			this.applyBoundTextures();
			this.disposeValue(value);
			value = this.value;

			console.debug(`MaterialBinding::shadingModel → ${value.type}`);
		}

		// TODO(test): Write tests for the edge cases here, ensure that we
		// don't get properties on a material from the wrong shading model.
		switch (shadingModel) {
			case ShadingModel.PHYSICAL:
				this._updatePhysical(value as MeshPhysicalMaterial); // falls through ⬇
			case ShadingModel.STANDARD:
				this._updateStandard(value as MeshStandardMaterial); // falls through ⬇
			default:
				this._updateBasic(value as MeshBasicMaterial);
		}

		for (const fn of this._textureUpdateFns) fn();

		return this.publishAll(); // TODO(perf)
	}

	private _updateBasic(target: MeshBasicMaterial) {
		const source = this.def;

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
		const source = this.def;

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
		const source = this.def;

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
			target.ior = 1.5;
		}

		// KHR_materials_sheen
		const sheen = source.getExtension<Sheen>('KHR_materials_sheen');
		if (sheen) {
			const sourceSheenColor = sheen.getSheenColorFactor();
			if (!eq(sourceSheenColor, target.sheenColor!.toArray(_vec3))) {
				target.sheenColor!.fromArray(sourceSheenColor);
			}
			if (sheen.getSheenRoughnessFactor() !== target.sheenRoughness) {
				target.sheenRoughness = sheen.getSheenRoughnessFactor();
			}
		} else {
			target.sheenColor!.setRGB(0, 0, 0);
		}

		// KHR_materials_specular
		const specular = source.getExtension<Specular>('KHR_materials_specular');
		if (specular) {
			if (specular.getSpecularFactor() !== target.specularIntensity) {
				target.specularIntensity = specular.getSpecularFactor();
			}
			const sourceSpecularColor = specular.getSpecularColorFactor();
			if (!eq(sourceSpecularColor, target.specularColor.toArray(_vec3))) {
				target.specularColor.fromArray(sourceSpecularColor);
			}
		} else {
			target.specularIntensity = 1.0;
			target.specularColor.setRGB(1, 1, 1);
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

		// KHR_materials_volume
		const volume = source.getExtension<Volume>('KHR_materials_volume');
		if (volume) {
			if (volume.getThicknessFactor() !== target.thickness) {
				if (target.thickness === 0) target.needsUpdate = true;
				target.thickness = volume.getThicknessFactor();
			}
			if (volume.getAttenuationDistance() !== target.attenuationDistance) {
				target.attenuationDistance = volume.getAttenuationDistance();
			}
			const sourceAttenuationColor = volume.getAttenuationColor();
			if (!eq(sourceAttenuationColor, target.attenuationColor.toArray(_vec3))) {
				target.attenuationColor.fromArray(sourceAttenuationColor);
			}
		} else {
			target.thickness = 0;
		}
	}

	public disposeValue(target: Material): void {
		pool.release(target).dispose();
	}

	public dispose() {
		for (const observer of this._textureObservers) {
			observer.dispose();
		}
		super.dispose();
	}
}

function getShadingModel(source: MaterialDef): ShadingModel {
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