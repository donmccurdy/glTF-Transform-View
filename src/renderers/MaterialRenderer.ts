import { ClampToEdgeWrapping, DoubleSide, FrontSide, LinearEncoding, LinearFilter, LinearMipmapLinearFilter, LinearMipmapNearestFilter, Material, MeshStandardMaterial, MirroredRepeatWrapping, NearestFilter, NearestMipmapLinearFilter, NearestMipmapNearestFilter, RepeatWrapping, Texture, TextureEncoding, TextureFilter, Wrapping, sRGBEncoding } from 'three';
import { Material as MaterialDef, Texture as TextureDef, TextureInfo as TextureInfoDef, vec3 } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { PropertyObserver } from '../observers';
import { eq } from '../utils';
import { Renderer } from './Renderer';

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

export class MaterialRenderer extends Renderer<MaterialDef, Material> {
	protected baseColorTexture = new PropertyObserver<TextureDef, Texture>(this._context);
	protected emissiveTexture = new PropertyObserver<TextureDef, Texture>(this._context);
	protected normalTexture = new PropertyObserver<TextureDef, Texture>(this._context);
	protected occlusionTexture = new PropertyObserver<TextureDef, Texture>(this._context);
	protected metallicRoughnessTexture = new PropertyObserver<TextureDef, Texture>(this._context);

	public constructor(context: UpdateContext, source: MaterialDef) {
		super(context, source, new MeshStandardMaterial());

		// TODO(bug): Resolve... min/mag filter, transform, colorspace.
		const target = this.value as MeshStandardMaterial;
		this.baseColorTexture.subscribe((texture) => {
			if (!texture) { target.map = null; return; }
			target.map = this.configureTexture(texture, source.getBaseColorTextureInfo()!, sRGBEncoding);
		});
		this.emissiveTexture.subscribe((texture) => {
			if (!texture) { target.map = null; return; }
			target.emissiveMap = this.configureTexture(texture, source.getEmissiveTextureInfo()!, sRGBEncoding);
		});
		this.normalTexture.subscribe((texture) => {
			if (!texture) { target.map = null; return; }
			target.normalMap = this.configureTexture(texture, source.getNormalTextureInfo()!, LinearEncoding);
		});
		this.occlusionTexture.subscribe((texture) => {
			if (!texture) { target.map = null; return; }
			target.aoMap = this.configureTexture(texture, source.getOcclusionTextureInfo()!, LinearEncoding);
		});
		this.metallicRoughnessTexture.subscribe((texture) => {
			if (!texture) { target.map = null; return; }
			texture = this.configureTexture(texture, source.getMetallicRoughnessTextureInfo()!, LinearEncoding);
			target.metalnessMap = target.roughnessMap = texture;
		});
	}

	public update(): this {
		const source = this.source;
		const target = this.value as MeshStandardMaterial;

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

		return this;
	}

	public configureTexture(texture: Texture, textureInfo: TextureInfoDef, encoding: TextureEncoding): Texture {
		// TODO(bug): Make a copy if needed...
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
