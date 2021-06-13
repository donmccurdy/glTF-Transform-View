import { ClampToEdgeWrapping, LinearEncoding, LinearFilter, LinearMipmapLinearFilter, LinearMipmapNearestFilter, Mesh, MeshStandardMaterial, MirroredRepeatWrapping, NearestFilter, NearestMipmapLinearFilter, NearestMipmapNearestFilter, RepeatWrapping, Texture, sRGBEncoding } from 'three';
import { Primitive as PrimitiveDef, Texture as TextureDef, TextureInfo as TextureInfoDef } from '@gltf-transform/core';

export function semanticToAttributeName(semantic: string): string {
	switch (semantic) {
		case 'POSITION': return 'position';
		case 'NORMAL': return 'normal';
		case 'TANGENT': return 'tangent';
		case 'COLOR_0': return 'color';
		case 'JOINTS_0': return 'skinIndex';
		case 'WEIGHTS_0': return 'skinWeight';
		case 'TEXCOORD_0': return 'uv';
		case 'TEXCOORD_1': return 'uv2';
		default: return '_' + semantic.toLowerCase();
	}
}

const WEBGL_FILTERS = {
	9728: NearestFilter,
	9729: LinearFilter,
	9984: NearestMipmapNearestFilter,
	9985: LinearMipmapNearestFilter,
	9986: NearestMipmapLinearFilter,
	9987: LinearMipmapLinearFilter
};

const WEBGL_WRAPPINGS = {
	33071: ClampToEdgeWrapping,
	33648: MirroredRepeatWrapping,
	10497: RepeatWrapping
};

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
		material.skinning = useSkinning;
	}

	// TODO: morph targets.
	// TODO: POINTS, LINES, etc.

	return material;
}

export function assignFinalTexture(
		slot: string,
		textureDef: TextureDef | null,
		textureInfoDef: TextureInfoDef | null,
		textureCache: Map<TextureDef, Texture>): Texture | null {
	if (!textureDef || !textureInfoDef) return null;

	const texture = _assignFinalTexture(
		textureCache.get(textureDef)!,
		textureInfoDef
	);

	texture.encoding = slot.match(/color|emissive/i) ? sRGBEncoding : LinearEncoding;

	return texture;
}

function _assignFinalTexture(texture: Texture, textureInfo: TextureInfoDef): Texture {
	texture = texture.clone();

	texture.flipY = false;
	texture.magFilter = textureInfo.getMagFilter() != null
		? WEBGL_FILTERS[ textureInfo.getMagFilter()! ]
		: LinearFilter;
	texture.minFilter = textureInfo.getMinFilter() != null
		? WEBGL_FILTERS[ textureInfo.getMinFilter()! ]
		: LinearMipmapLinearFilter;
	texture.wrapS = WEBGL_WRAPPINGS[ textureInfo.getWrapS() ];
	texture.wrapT = WEBGL_WRAPPINGS[ textureInfo.getWrapT() ];

	// TODO(feat): Manage uv2.

	texture.needsUpdate = true;
	return texture;
}

export function eq(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}