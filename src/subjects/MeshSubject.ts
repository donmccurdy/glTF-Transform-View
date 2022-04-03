import { Group } from 'three';
import { Mesh as MeshDef, Primitive as PrimitiveDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { Subject } from './Subject';
import { RefListObserver } from '../observers';
import { MeshLike } from '../constants';
import { SingleUserParams, SingleUserPool } from '../pools';

export class MeshSubject extends Subject<MeshDef, Group> {
	protected primitives = new RefListObserver<PrimitiveDef, MeshLike, SingleUserParams>('primitives', this._context)
		.setParamsFn(() => SingleUserPool.createParams(this.def))

	constructor(context: UpdateContext, def: MeshDef) {
		super(context, def, context.meshPool.requestBase(new Group()), context.meshPool);

		this.primitives.subscribe((nextPrims, prevPrims) => {
			if (prevPrims.length) this.value.remove(...prevPrims);
			if (nextPrims.length) this.value.add(...nextPrims);
			this.publishAll();
		});
	}

	update() {
		const def = this.def;
		const value = this.value;

		if (def.getName() !== value.name) {
			value.name = def.getName();
		}

		this.primitives.updateDefList(def.listPrimitives());
	}

	dispose() {
		this.primitives.dispose();
		super.dispose();
	}
}
