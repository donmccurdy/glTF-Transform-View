import { TextureInfo } from '@gltf-transform/core';
import { TextureFilter, NearestFilter, LinearFilter, NearestMipmapNearestFilter, LinearMipmapNearestFilter, NearestMipmapLinearFilter, LinearMipmapLinearFilter, Wrapping, ClampToEdgeWrapping, MirroredRepeatWrapping, RepeatWrapping, TextureEncoding, Texture } from 'three';

/**
 * Abstract cache, supporting reuse of 'variant' objects derived from 'base'
 * objects, given a parameter set. Unlike a pool, objects in the cache are
 * disposed once no users remain.
 *
 * Example: MaterialBinding may need multiple THREE.Texture instances from a
 * single glTF-Transform Texture instance, based on TextureInfo configuration.
 * This cache creates those variants, reuses older copies when possible, and
 * destroys variants that are no longer used.
 */
export class VariantCache<T, P> {
	readonly _cache: {[key: string]: {users: number, value: T}} = {};
	readonly _createKey: (t: T, p: P) => string;
	readonly _createValue: (t: T, p: P) => T;
	readonly _disposeValue: (t: T) => void;

	constructor(key: (t: T, p: P) => string, create: (t: T, p: P) => T, dispose: (t: T) => void) {
		this._createKey = key;
		this._createValue = create;
		this._disposeValue = dispose;
	}

	/** Borrow an instance from the pool, creating it if necessary. */
	public request(value: T, params: P): T {
		const key = this._createKey(value, params);

		if (this._cache[key]) {
			this._cache[key].users++;
			return this._cache[key].value;
		}

		value = this._createValue(value, params);
		this._cache[key] = {users: 1, value};
		console.debug(`VariantCache::size → ${Object.keys(this._cache).length}`);
		return value;
	}

	/** Return an instance to the pool, destroying it if no users remain. */
	public release(value: T) {
		for (let key in this._cache) {
			const entry = this._cache[key];
			if (entry.value !== value) continue;

			entry.users--;
			if (entry.users > 0) continue;

			this._disposeValue(entry.value);
			delete this._cache[key];
			console.debug(`VariantCache::size → ${Object.keys(this._cache).length}`);
		}
	}
}

/******************************************************************************
 * Texture Cache
 */

// TODO(feat): Implement.

/******************************************************************************
 * Mesh Cache
 */

// TODO(feat): Implement.

/******************************************************************************
 * Texture Cache
 */

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

export function createTextureCache(): VariantCache<Texture, TextureParams> {
    return new VariantCache(
		(texture: Texture, params: TextureParams): string => {
			return texture.uuid + ':' + Object.values(params).join(':');
		},
		(texture: Texture, params: TextureParams): Texture => {
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
		},
		(t: Texture): void => {
			t.dispose();
		}
	);
}
