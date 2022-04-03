import { BufferAttribute } from 'three';
import { Accessor as AccessorDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { Subject } from './Subject';
import { ValuePool } from '../pools';

export class AccessorSubject extends Subject<AccessorDef, BufferAttribute> {
	constructor(context: UpdateContext, def: AccessorDef) {
		super(
			context,
			def,
			AccessorSubject.createValue(def, context.accessorPool),
			context.accessorPool,
		);
	}

	private static createValue(def: AccessorDef, pool: ValuePool<BufferAttribute>) {
		return pool.requestBase(new BufferAttribute(
			def.getArray()!,
			def.getElementSize(),
			def.getNormalized()
		));
	}

	update() {
		const def = this.def;
		const value = this.value;

		if (def.getArray() !== value.array
			|| def.getElementSize() !== value.itemSize
			|| def.getNormalized() !== value.normalized) {
			this.pool.releaseBase(value);
			this.value = AccessorSubject.createValue(def, this.pool);
		} else {
			value.needsUpdate = true;
		}
	}
}
