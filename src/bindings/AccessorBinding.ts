import { BufferAttribute } from 'three';
import { Accessor as AccessorDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { Binding } from './Binding';
import { pool } from '../ObjectPool';

export class AccessorBinding extends Binding<AccessorDef, BufferAttribute> {
	public constructor(context: UpdateContext, def: AccessorDef) {
		super(context, def, AccessorBinding.createValue(def));
	}

	private static createValue(def: AccessorDef): BufferAttribute {
		return pool.request(new BufferAttribute(
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
			// TODO(cleanup): Consolidate?
			this.disposeValue(value);
			this.value = AccessorBinding.createValue(def);
		} else {
			value.needsUpdate = true;
		}

		return this.publishAll(); // TODO(perf)
	}

	public disposeValue(value: BufferAttribute): void {
		pool.release(value);
	}
}
