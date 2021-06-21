import { Mesh, MeshStandardMaterial } from 'three';
import { Primitive as PrimitiveDef } from '@gltf-transform/core';

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

	// TODO: morph targets.
	// TODO: POINTS, LINES, etc.

	return material;
}

export function eq(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}
