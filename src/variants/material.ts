import { GLTF, Primitive as PrimitiveDef } from '@gltf-transform/core';
import { pool } from '../ObjectPool';
import { LineBasicMaterial, Material, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, PointsMaterial } from 'three';

export type SourceMaterial = MeshBasicMaterial | MeshStandardMaterial | MeshPhysicalMaterial;
export type VariantMaterial = MeshBasicMaterial | MeshStandardMaterial | MeshPhysicalMaterial | LineBasicMaterial | PointsMaterial;

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

/** Creates a variant material for given source material and MaterialParams. */
export function createMaterialVariant(srcMaterial: SourceMaterial, params: MaterialParams): VariantMaterial {
	console.debug('alloc::createMaterialVariant');
	switch (params.mode) {
		case PrimitiveDef.Mode.TRIANGLES:
		case PrimitiveDef.Mode.TRIANGLE_FAN:
		case PrimitiveDef.Mode.TRIANGLE_STRIP:
			return updateMaterialVariant(srcMaterial, pool.request(srcMaterial.clone()), params);
		case PrimitiveDef.Mode.LINES:
		case PrimitiveDef.Mode.LINE_LOOP:
		case PrimitiveDef.Mode.LINE_STRIP:
			return updateMaterialVariant(srcMaterial, pool.request(new LineBasicMaterial()), params);
		case PrimitiveDef.Mode.POINTS:
			return updateMaterialVariant(srcMaterial, pool.request(new PointsMaterial()), params);
		default:
			throw new Error(`Unexpected primitive mode: ${params.mode}`);
	}
}

/**
 * Updates a variant material to match new changes to the source material.
 *
 * NOTICE: Changes to MaterialParams should _NOT_ be applied with this method.
 * Instead, create a new variant and dispose the old if unused.
 */
export function updateMaterialVariant(srcMaterial: SourceMaterial, dstMaterial: VariantMaterial, params: MaterialParams): VariantMaterial {
	if (srcMaterial.type === dstMaterial.type) {
		dstMaterial.copy(srcMaterial);
	} else if (dstMaterial instanceof LineBasicMaterial) {
		Material.prototype.copy.call(dstMaterial, srcMaterial);
		dstMaterial.color.copy((srcMaterial as MeshStandardMaterial).color);
	} else if (dstMaterial instanceof PointsMaterial) {
		Material.prototype.copy.call(dstMaterial, srcMaterial);
		dstMaterial.color.copy((srcMaterial as MeshStandardMaterial).color);
		dstMaterial.map = (srcMaterial as MeshStandardMaterial).map;
		dstMaterial.sizeAttenuation = false;
	}

	if (params.useVertexColors) {
		dstMaterial.vertexColors = true;
	}
	if (params.useFlatShading && dstMaterial instanceof MeshStandardMaterial) {
		dstMaterial.flatShading = true;
	}
	if (!params.useVertexTangents) {
		// https://github.com/mrdoob/three.js/issues/11438#issuecomment-507003995
		if (dstMaterial instanceof MeshStandardMaterial) {
			dstMaterial.normalScale.y *= -1;
		}
		if (dstMaterial instanceof MeshPhysicalMaterial) {
			dstMaterial.clearcoatNormalScale.y *= -1;
		}
	}

	if (dstMaterial.version < srcMaterial.version) {
		dstMaterial.version = srcMaterial.version;
	}

	return dstMaterial;
}
