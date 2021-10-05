import { Property as PropertyDef, Mesh as MeshDef, Node as NodeDef, Primitive as PrimitiveDef, uuid } from '@gltf-transform/core';
import { pool } from '../ObjectPool';
import { Object3D } from 'three';
import { ObserverMap } from './ObserverMap';

interface Object3DParams {id: string}
type Object3DDef = PrimitiveDef | MeshDef | NodeDef;

export class Object3DMap extends ObserverMap<Object3D, Object3D, Object3DParams> {
	private static _parentIDs = new WeakMap<PropertyDef, string>();

	protected _createVariant(srcMesh: Object3D): Object3D {
		return pool.request(srcMesh.clone());
	}

	protected _updateVariant(srcMesh: Object3D, dstMesh: Object3D): Object3D {
		return dstMesh.clear().copy(srcMesh);
	}

	protected _disposeVariant(mesh: Object3D): void {
		pool.release(mesh);
	}

	/** Generates a unique Object3D for every parent. */
	public static createParams(property: Object3DDef): Object3DParams {
		const id = this._parentIDs.get(property) || uuid();
		this._parentIDs.set(property, id);
		return {id};
	}
}
