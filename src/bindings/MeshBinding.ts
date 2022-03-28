import { Group } from 'three';
import { Mesh as MeshDef, Primitive as PrimitiveDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { Binding } from './Binding';
import { pool } from '../ObjectPool';
import { Object3DMap } from '../maps';
import { RefListObserver } from '../observers';
import { MeshLike } from '../utils';

export class MeshBinding extends Binding<MeshDef, Group> {
	protected primitives = new RefListObserver<PrimitiveDef, MeshLike>('primitives', this._context)
		.setParamsFn(() => Object3DMap.createParams(this.def) as unknown as Record<string, unknown>)

	public constructor(context: UpdateContext, def: MeshDef) {
		super(context, def, pool.request(new Group()));

		this.primitives.subscribe((nextPrims, prevPrims) => {
			this.value.remove(...prevPrims!);
			this.value.add(...nextPrims);
			this.publishAll();
		});
	}

	public update(): this {
		const def = this.def;
		const value = this.value;

		if (def.getName() !== value.name) {
			value.name = def.getName();
		}

		this.primitives.updateRefList(def.listPrimitives());

		return this.publishAll(); // TODO(perf)
	}

	public disposeValue(target: Group) {
		pool.release(target);
	}

	public dispose() {
		this.primitives.dispose();
		super.dispose();
	}
}
