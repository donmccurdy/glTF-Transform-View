import { Property as PropertyDef, Mesh as MeshDef, Node as NodeDef, uuid, Primitive as PrimitiveDef } from '@gltf-transform/core';
import { Object3D } from 'three';
import { ValuePool } from './Pool';

export interface SingleUserParams {id: string}

export class SingleUserPool<T extends Object3D> implements ValuePool<T, SingleUserParams> {
    private static _parentIDs = new WeakMap<PropertyDef, string>();

    /** Generates a unique Object3D for every parent. */
    static createParams(property: MeshDef | NodeDef): SingleUserParams {
        const id = this._parentIDs.get(property) || uuid();
        this._parentIDs.set(property, id);
        return {id};
    }

    requestBase(base: T): T {
        return base;
    }

    releaseBase(base: T): void {}

    requestVariant(base: T, params: SingleUserParams): T {
        return this._createVariant(base, params);
    }

    releaseVariant(variant: T): void {}

    dispose(): void {
        throw new Error('Method not implemented.');
    }
    debug(): void {
        throw new Error('Method not implemented.');
    }

    protected _createVariant(srcObject: T, _params: SingleUserParams): T {
		return srcObject.clone();
	}

	protected _updateVariant(srcObject: T, dstObject: T): T {
		return dstObject.clear().copy(srcObject);
	}
}
