import { Property as PropertyDef } from '@gltf-transform/core';
import { pool } from '../ObjectPool';
import { Object3D } from 'three';
import { VariantCache } from './VariantCache';

interface MeshParams {id: number}

let nextID = 1;
const parentIDs = new WeakMap<PropertyDef, number>();

/** Generates a unique Object3D for every parent. */
export function createMeshParams(property: PropertyDef): MeshParams {
	const id = parentIDs.get(property) || nextID++;
	parentIDs.set(property, id);
	return {id};
}

/** TODO(cleanup): If this works, rename it. */
export class MeshVariantCache extends VariantCache<Object3D, Object3D, MeshParams> {
	protected _createVariant(srcMesh: Object3D): Object3D {
		console.debug('alloc::createMeshVariant');
		return pool.request(srcMesh.clone());
	}

	protected _updateVariant(srcMesh: Object3D, dstMesh: Object3D): Object3D {
		return dstMesh.clear().copy(srcMesh);
	}

	protected _disposeVariant(mesh: Object3D): void {
		pool.release(mesh);
	}
}
