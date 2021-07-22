import { TextureInfo } from '@gltf-transform/core';
import { ClampToEdgeWrapping, LinearFilter, LinearMipmapLinearFilter, LinearMipmapNearestFilter, MirroredRepeatWrapping, NearestFilter, NearestMipmapLinearFilter, NearestMipmapNearestFilter, RepeatWrapping, Texture, TextureEncoding, TextureFilter, Wrapping } from 'three';

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

export interface TextureParams {
	encoding: TextureEncoding,
	minFilter: TextureFilter,
	magFilter: TextureFilter,
	wrapS: Wrapping,
	wrapT: Wrapping,
}

export function createTextureParams(textureInfo: TextureInfo, encoding: TextureEncoding): TextureParams {
	return {
		minFilter: WEBGL_FILTERS[textureInfo.getMinFilter() as number] || LinearMipmapLinearFilter,
		magFilter: WEBGL_FILTERS[textureInfo.getMagFilter() as number] || LinearFilter,
		wrapS: WEBGL_WRAPPINGS[textureInfo.getWrapS()] || RepeatWrapping,
		wrapT: WEBGL_WRAPPINGS[textureInfo.getWrapT()] || RepeatWrapping,
		encoding: encoding,
	}
}

export function createTextureVariant(texture: Texture, params: TextureParams): Texture {
	texture = texture.clone();
	texture.minFilter = params.minFilter;
	texture.magFilter = params.magFilter;
	texture.wrapS = params.wrapS;
	texture.wrapT = params.wrapT;
	texture.encoding = params.encoding;

	if (texture.image.complete) {
		texture.needsUpdate = true;
	} else {
		texture.image.onload = () => (texture.needsUpdate = true);
	}

	return texture;
}
