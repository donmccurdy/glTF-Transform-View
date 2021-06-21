import { Group, Mesh } from 'three';
import { Mesh as MeshDef, Primitive as PrimitiveDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { PropertyListObserver } from '../observers';
import { Binding } from './Binding';

export class MeshBinding extends Binding<MeshDef, Group> {
	protected primitives = new PropertyListObserver<PrimitiveDef, Mesh>(this._context);

	public constructor(context: UpdateContext, source: MeshDef) {
		super(context, source, new Group());

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

	public dispose() {
		this.primitives.dispose();
		super.dispose();
	}
}
