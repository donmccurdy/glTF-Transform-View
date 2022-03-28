import { BufferAttribute } from 'three';
import { Accessor as AccessorDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { Binding } from './Binding';
import { ValuePool } from '../pools';

export class AccessorBinding extends Binding<AccessorDef, BufferAttribute> {
	public constructor(context: UpdateContext, def: AccessorDef) {
		super(
			context,
			def,
			AccessorBinding.createValue(def, context.accessorPool),
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

	public update(): this {
		const def = this.def;
		const value = this.value;

		if (def.getArray() !== value.array
			|| def.getElementSize() !== value.itemSize
			|| def.getNormalized() !== value.normalized) {
			this.pool.releaseBase(value);
			this.value = AccessorBinding.createValue(def, this.pool);
		} else {
			value.needsUpdate = true;
		}

		return this.publishAll(); // TODO(perf)
	}
}
