import { Group } from 'three';
import { Mesh as MeshDef, Primitive as PrimitiveDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { Binding } from './Binding';
import { RefListObserver } from '../observers';
import { MeshLike } from '../constants';
import { Object3DParams, Object3DPool } from '../pools';

export class MeshBinding extends Binding<MeshDef, Group> {
	protected primitives = new RefListObserver<PrimitiveDef, MeshLike, Object3DParams>('primitives', this._context)
		.setParamsFn(() => Object3DPool.createParams(this.def))

	public constructor(context: UpdateContext, def: MeshDef) {
		super(context, def, context.meshPool.requestBase(new Group()), context.meshPool);

		this.primitives.subscribe((nextPrims, prevPrims) => {
			this.value.remove(...prevPrims!);
			this.value.add(...nextPrims);
			this.publishAll();
		});
	}

	public update(): this {
		const def = this.def;
		const value = this.value;

		console.log('MeshBinding::update');

		if (def.getName() !== value.name) {
			value.name = def.getName();
		}

		this.primitives.updateRefList(def.listPrimitives());

		return this.publishAll(); // TODO(perf)
	}

	public dispose() {
		this.primitives.dispose();
		super.dispose();
	}
}
