import { ClampToEdgeWrapping, LinearFilter, LinearMipmapLinearFilter, LinearMipmapNearestFilter, Mesh, MeshStandardMaterial, MirroredRepeatWrapping, NearestFilter, NearestMipmapLinearFilter, NearestMipmapNearestFilter, RepeatWrapping, TextureEncoding, TextureFilter, Wrapping } from 'three';
import { Primitive as PrimitiveDef, TextureInfo } from '@gltf-transform/core';

// TODO(cleanup): Can we remove the need for this?
export function assignFinalMaterial(primDef: PrimitiveDef, material: MeshStandardMaterial, mesh: Mesh): MeshStandardMaterial {
	const useVertexTangents = !!primDef.getAttribute('TANGENT');
	const useVertexColors = !!primDef.getAttribute('COLOR_0');
	const useFlatShading = !primDef.getAttribute('NORMAL');
	const useSkinning = (mesh as unknown as {isSkinnedMesh: boolean|undefined})['isSkinnedMesh'] === true;

	if (useVertexTangents || useVertexColors || useFlatShading || useSkinning) {
		material = material.clone() as MeshStandardMaterial;
		material.vertexTangents = useVertexTangents;
		material.vertexColors = useVertexColors;
		material.flatShading = useFlatShading;
	}

	// TODO(bug): morph targets.
	// TODO(bug): POINTS, LINES, etc.

	return material;
}

export function eq(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

/******************************************************************************
 * Texture utilities.
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

/**
 * Abstract cache/pool, supporting reuse of objects derived from shared base
 * objects based on a defined parameter set.
 *
 * Example: MaterialBinding may need multiple THREE.Texture instances from a
 * single glTF-Transform Texture instance, based on TextureInfo configuration.
 * This cache helps create those variants, reusing older copies if possible.
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
