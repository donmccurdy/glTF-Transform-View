import { GLTF, Primitive as PrimitiveDef } from '@gltf-transform/core';
import { LineBasicMaterial, Material, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, PointsMaterial } from 'three';
import type { ValuePool } from './Pool';

export type SourceMaterial = MeshBasicMaterial | MeshStandardMaterial | MeshPhysicalMaterial;
export type VariantMaterial = MeshBasicMaterial | MeshStandardMaterial | MeshPhysicalMaterial | LineBasicMaterial | PointsMaterial;

export interface MaterialParams {
	mode: GLTF.MeshPrimitiveMode,
	useVertexTangents: boolean,
	useVertexColors: boolean,
	useMorphTargets: boolean,
	useFlatShading: boolean,
}

export class MaterialPool implements ValuePool<Material, MaterialParams> {
    static createParams(primitive: PrimitiveDef): MaterialParams {
		return {
			mode: primitive.getMode(),
			useVertexTangents: !!primitive.getAttribute('TANGENT'),
			useVertexColors: !!primitive.getAttribute('COLOR_0'),
			useFlatShading: !primitive.getAttribute('NORMAL'),
			useMorphTargets: primitive.listTargets().length > 0,
		}
	}

    requestBase(base: Material): Material {
        return base;
    }
    releaseBase(base: Material): void {
        // base.dispose();
    }
    requestVariant(base: Material, params: MaterialParams): Material {
        return this._createVariant(base as SourceMaterial, params);
    }
    releaseVariant(variant: Material): void {
        // variant.dispose();
    }
    dispose(): void {
        throw new Error('Method not implemented.');
    }
    debug(): void {
        throw new Error('Method not implemented.');
    }

	/** Creates a variant material for given source material and MaterialParams. */
	protected _createVariant(srcMaterial: SourceMaterial, params: MaterialParams): VariantMaterial {
		switch (params.mode) {
			case PrimitiveDef.Mode.TRIANGLES:
			case PrimitiveDef.Mode.TRIANGLE_FAN:
			case PrimitiveDef.Mode.TRIANGLE_STRIP:
				return this._updateVariant(srcMaterial, srcMaterial.clone(), params);
			case PrimitiveDef.Mode.LINES:
			case PrimitiveDef.Mode.LINE_LOOP:
			case PrimitiveDef.Mode.LINE_STRIP:
				return this._updateVariant(srcMaterial, new LineBasicMaterial(), params);
			case PrimitiveDef.Mode.POINTS:
				return this._updateVariant(srcMaterial, new PointsMaterial(), params);
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
	protected _updateVariant(srcMaterial: SourceMaterial, dstMaterial: VariantMaterial, params: MaterialParams): VariantMaterial {
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
}
