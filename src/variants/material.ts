import { GLTF, Primitive as PrimitiveDef } from '@gltf-transform/core';
import { LineBasicMaterial, Material, MeshStandardMaterial, PointsMaterial } from 'three';

export interface MaterialParams {
	mode: GLTF.MeshPrimitiveMode,
	useVertexTangents: boolean,
	useVertexColors: boolean,
	useMorphTargets: boolean,
	useFlatShading: boolean,
}

export function createMaterialParams(primitive: PrimitiveDef): MaterialParams {
	return {
		mode: primitive.getMode(),
		useVertexTangents: !!primitive.getAttribute('TANGENT'),
		useVertexColors: !!primitive.getAttribute('COLOR_0'),
		useFlatShading: !primitive.getAttribute('NORMAL'),
		useMorphTargets: primitive.listTargets().length > 0,
	}
}

export function createMaterialVariant(material: Material, params: MaterialParams): Material {
    const inputMaterial = (material as MeshStandardMaterial);
    let outputMaterial: MeshStandardMaterial | LineBasicMaterial | PointsMaterial;
    switch (params.mode) {
        case PrimitiveDef.Mode.TRIANGLES:
        case PrimitiveDef.Mode.TRIANGLE_FAN:
        case PrimitiveDef.Mode.TRIANGLE_STRIP:
            outputMaterial = inputMaterial.clone();
            break;
        case PrimitiveDef.Mode.LINES:
        case PrimitiveDef.Mode.LINE_LOOP:
        case PrimitiveDef.Mode.LINE_STRIP:
            outputMaterial = new LineBasicMaterial();
            Material.prototype.copy.call(outputMaterial, inputMaterial);
            outputMaterial.color.copy((inputMaterial).color);
            break;
        case PrimitiveDef.Mode.POINTS:
            outputMaterial = new PointsMaterial();
            Material.prototype.copy.call(outputMaterial, inputMaterial);
            outputMaterial.color.copy((inputMaterial).color);
            outputMaterial.map = inputMaterial.map;
            outputMaterial.sizeAttenuation = false;
            break;
        default:
            throw new Error(`Unexpected primitive mode: ${params.mode}`);
    }

    if (params.useVertexColors) outputMaterial.vertexColors = true;
    if (params.useMorphTargets) outputMaterial.morphTargets = true;
    if (!(outputMaterial instanceof LineBasicMaterial)
            && !(outputMaterial instanceof PointsMaterial)) {
        // TODO(bug): Different fix required with vertex tangents...
        // https://github.com/mrdoob/three.js/issues/11438#issuecomment-507003995
        if (params.useVertexTangents) outputMaterial.vertexTangents = true;
        if (params.useFlatShading) outputMaterial.flatShading = true;
    }

    return outputMaterial;
}