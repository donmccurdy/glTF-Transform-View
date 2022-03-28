import { DoubleSide, FrontSide, LinearEncoding, Material, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, Texture, TextureEncoding, sRGBEncoding, MathUtils } from 'three';
import { Material as MaterialDef, Texture as TextureDef, TextureInfo as TextureInfoDef, vec3 } from '@gltf-transform/core';
import type { Clearcoat, IOR, Sheen, Specular, Transmission, Volume } from '@gltf-transform/extensions';
import type { UpdateContext } from '../UpdateContext';
import { eq } from '../utils';
import { Binding } from './Binding';
import { RefObserver } from '../observers';
import { Subscription } from '../utils/EventDispatcher';
import { TextureParams, TexturePool, ValuePool } from '../pools';

const _vec3: vec3 = [0, 0, 0];

enum ShadingModel {
	UNLIT = 0,
	STANDARD = 1,
	PHYSICAL = 2,
}

// TODO(bug): Missing change listeners on ExtensionProperty.
// TODO(bug): Missing change listeners on TextureInfo.

export class MaterialBinding extends Binding<MaterialDef, Material> {
	protected readonly baseColorTexture = new RefObserver<TextureDef, Texture, TextureParams>('baseColorTexture', this._context);
	protected readonly emissiveTexture = new RefObserver<TextureDef, Texture, TextureParams>('emissiveTexture', this._context);
	protected readonly normalTexture = new RefObserver<TextureDef, Texture, TextureParams>('normalTexture', this._context);
	protected readonly occlusionTexture = new RefObserver<TextureDef, Texture, TextureParams>('occlusionTexture', this._context);
	protected readonly metallicRoughnessTexture = new RefObserver<TextureDef, Texture, TextureParams>('metallicRoughnessTexture', this._context);

	// KHR_materials_clearcoat
	protected readonly clearcoatTexture = new RefObserver<TextureDef, Texture, TextureParams>('clearcoatTexture', this._context);
	protected readonly clearcoatRoughnessTexture = new RefObserver<TextureDef, Texture, TextureParams>('clearcoatRoughnessTexture', this._context);
	protected readonly clearcoatNormalTexture = new RefObserver<TextureDef, Texture, TextureParams>('clearcoatNormalTexture', this._context);

	// KHR_materials_sheen
	protected readonly sheenColorTexture = new RefObserver<TextureDef, Texture, TextureParams>('sheenColorTexture', this._context);
	protected readonly sheenRoughnessTexture = new RefObserver<TextureDef, Texture, TextureParams>('sheenRoughnessTexture', this._context);

	// KHR_materials_specular
	protected readonly specularTexture = new RefObserver<TextureDef, Texture, TextureParams>('specularTexture', this._context);
	protected readonly specularColorTexture = new RefObserver<TextureDef, Texture, TextureParams>('specularColorTexture', this._context);

	// KHR_materials_transmission
	protected readonly transmissionTexture = new RefObserver<TextureDef, Texture, TextureParams>('transmissionTexture', this._context);

	// KHR_materials_volume
	protected readonly thicknessTexture = new RefObserver<TextureDef, Texture, TextureParams>('thicknessTexture', this._context);

	private readonly _textureObservers: RefObserver<TextureDef, Texture, TextureParams>[] = [];
	private readonly _textureUpdateFns: (() => void)[] = [];

	public constructor(context: UpdateContext, def: MaterialDef) {
		super(context, def, MaterialBinding.createValue(def, context.materialPool), context.materialPool);

		this.bindTexture(['map'], this.baseColorTexture, () => def.getBaseColorTexture(), () => def.getBaseColorTextureInfo(), sRGBEncoding);
		this.bindTexture(['emissiveMap'], this.emissiveTexture, () => def.getEmissiveTexture(), () => def.getEmissiveTextureInfo(), sRGBEncoding);
		this.bindTexture(['normalMap'], this.normalTexture, () => def.getNormalTexture(), () => def.getNormalTextureInfo(), LinearEncoding);
		this.bindTexture(['aoMap'], this.occlusionTexture, () => def.getOcclusionTexture(), () => def.getOcclusionTextureInfo(), LinearEncoding);
		this.bindTexture(['roughnessMap', 'metalnessMap'], this.metallicRoughnessTexture, () => def.getMetallicRoughnessTexture(), () => def.getMetallicRoughnessTextureInfo(), LinearEncoding);

		// KHR_materials_clearcoat
		const clearcoatExt = (): Clearcoat | null => def.getExtension<Clearcoat>('KHR_materials_clearcoat');
		this.bindTexture(['clearcoatMap'], this.clearcoatTexture, () => clearcoatExt()?.getClearcoatTexture() || null, () => clearcoatExt()?.getClearcoatTextureInfo() || null, LinearEncoding);
		this.bindTexture(['clearcoatRoughnessMap'], this.clearcoatRoughnessTexture, () => clearcoatExt()?.getClearcoatRoughnessTexture() || null, () => clearcoatExt()?.getClearcoatRoughnessTextureInfo() || null, LinearEncoding);
		this.bindTexture(['clearcoatNormalMap'], this.clearcoatNormalTexture, () => clearcoatExt()?.getClearcoatNormalTexture() || null, () => clearcoatExt()?.getClearcoatNormalTextureInfo() || null, LinearEncoding);

		// KHR_materials_sheen
		const sheenExt = (): Sheen | null => def.getExtension<Sheen>('KHR_materials_sheen');
		this.bindTexture(['sheenColorMap'], this.sheenColorTexture, () => sheenExt()?.getSheenColorTexture() || null, () => sheenExt()?.getSheenColorTextureInfo() || null, sRGBEncoding);
		this.bindTexture(['sheenRoughnessMap'], this.sheenRoughnessTexture, () => sheenExt()?.getSheenRoughnessTexture() || null, () => sheenExt()?.getSheenRoughnessTextureInfo() || null, LinearEncoding);

		// KHR_materials_specular
		const specularExt = (): Specular | null => def.getExtension<Specular>('KHR_materials_specular');
		this.bindTexture(['specularIntensityMap'], this.specularTexture, () => specularExt()?.getSpecularTexture() || null, () => specularExt()?.getSpecularTextureInfo() || null, LinearEncoding);
		this.bindTexture(['specularColorMap'], this.specularColorTexture, () => specularExt()?.getSpecularColorTexture() || null, () => specularExt()?.getSpecularColorTextureInfo() || null, sRGBEncoding);

		// KHR_materials_transmission
		const transmissionExt = (): Transmission | null => def.getExtension<Transmission>('KHR_materials_transmission');
		this.bindTexture(['transmissionMap'], this.transmissionTexture, () => transmissionExt()?.getTransmissionTexture() || null, () => transmissionExt()?.getTransmissionTextureInfo() || null, LinearEncoding);

		// KHR_materials_volume
		const volumeExt = (): Volume | null => def.getExtension<Volume>('KHR_materials_volume');
		this.bindTexture(['thicknessMap'], this.thicknessTexture, () => volumeExt()?.getThicknessTexture() || null, () => volumeExt()?.getThicknessTextureInfo() || null, LinearEncoding);
	}

	private bindTexture(
			maps: string[],
			observer: RefObserver<TextureDef, Texture, TextureParams>,
			textureFn: () => TextureDef | null,
			textureInfoFn: () => TextureInfoDef | null,
			encoding: TextureEncoding): Subscription {

		observer.setParamsFn(() => TexturePool.createParams(textureInfoFn()!, encoding));

		this._textureObservers.push(observer);

		this._textureUpdateFns.push(() => {
			observer.updateRef(textureFn());
		})

		return observer.subscribe((texture) => {
			const material = this.value as any;
			for (const map of maps) {
				if (!(map in material)) continue; // Unlit ⊂ Standard ⊂ Physical (& Points, Lines)
				if (!!material[map] !== !!texture) material.needsUpdate = true; // Recompile on add/remove.
				material[map] = texture;
			}
			this.publishAll();
		});
	}

	private static createValue(def: MaterialDef, pool: ValuePool<Material>): Material {
		const shadingModel = getShadingModel(def);
		switch (shadingModel) {
			case ShadingModel.UNLIT:
				return pool.requestBase(new MeshBasicMaterial());
			case ShadingModel.STANDARD:
				return pool.requestBase(new MeshStandardMaterial());
			case ShadingModel.PHYSICAL:
				return pool.requestBase(new MeshPhysicalMaterial());
			default:
				throw new Error('Unsupported shading model.');
		}
	}

	public update(): this {
		const def = this.def;
		let value = this.value;

		console.log('MaterialBinding::update');

		const shadingModel = getShadingModel(def);
		if (shadingModel === ShadingModel.UNLIT && value.type !== 'MeshBasicMaterial'
			|| shadingModel === ShadingModel.STANDARD && value.type !== 'MeshStandardMaterial'
			|| shadingModel === ShadingModel.PHYSICAL && value.type !== 'MeshPhysicalMaterial') {
			this.pool.releaseBase(this.value);
			this.value = MaterialBinding.createValue(def, this.pool);
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