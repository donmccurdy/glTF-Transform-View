import { Property as PropertyDef, Mesh as MeshDef, Node as NodeDef, Primitive as PrimitiveDef, uuid } from '@gltf-transform/core';
import { pool } from '../ObjectPool';
import { Object3D } from 'three';
import { ObserverMap } from './ObserverMap';

interface Object3DParams {id: string}
type Object3DDef = PrimitiveDef | MeshDef | NodeDef;

export class Object3DMap extends ObserverMap<Object3D, Object3D, Object3DParams> {
	private static _parentIDs = new WeakMap<PropertyDef, string>();

	protected _createVariant(srcObject: Object3D): Object3D {
		return pool.request(srcObject.clone());
	}

	protected _updateVariant(srcObject: Object3D, dstObject: Object3D): Object3D {
		return dstObject.clear().copy(srcObject);
	}

	protected _disposeVariant(object: Object3D): void {
		pool.release(object);
	}

	/** Generates a unique Object3D for every parent. */
	public static createParams(property: Object3DDef): Object3DParams {
		const id = this._parentIDs.get(property) || uuid();
		this._parentIDs.set(property, id);
		return {id};
	}
}
