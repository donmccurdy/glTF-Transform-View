import { Group, Object3D } from 'three';
import { Mesh as MeshDef, Primitive as PrimitiveDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { PropertyListObserver } from '../observers';
import { Binding } from './Binding';
import { pool } from '../ObjectPool';
import { Object3DMap } from '../maps';

export class MeshBinding extends Binding<MeshDef, Group> {
	protected primitives = new PropertyListObserver<PrimitiveDef, Object3D>('primitives', this._context)
		.map(this._context.meshMap, () => Object3DMap.createParams(this.source));

	public constructor(context: UpdateContext, source: MeshDef) {
		super(context, source, pool.request(new Group()));

		this.primitives.subscribe((primitives) => {
			if (primitives.remove) this.value.remove(primitives.remove);
			if (primitives.add) this.value.add(primitives.add);
		});
	}

	public update(): this {
		const source = this.source;
		const target = this.value;

		if (source.getName() !== target.name) {
			target.name = source.getName();
		}

		this.primitives.update(source.listPrimitives());

		return this;
	}

	public disposeTarget(target: Group) {
		pool.release(target);
	}

	public dispose() {
		this.primitives.dispose();
		super.dispose();
	}
}
