import { BufferAttribute } from 'three';
import { Accessor as AccessorDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { Binding } from './Binding';

export class AccessorBinding extends Binding<AccessorDef, BufferAttribute> {
	public constructor(context: UpdateContext, source: AccessorDef) {
		super(context, source, AccessorBinding.createTarget(source));
	}

	private static createTarget(source: AccessorDef): BufferAttribute {
		return new BufferAttribute(
			source.getArray()!,
			source.getElementSize(),
			source.getNormalized()
		);
	}

	public update(): this {
		const source = this.source;
		const target = this.value;

		if (source.getArray() !== target.array
			|| source.getElementSize() !== target.itemSize
			|| source.getNormalized() !== target.normalized) {
			this.next(AccessorBinding.createTarget(source));
		} else {
			// TODO(feat): Conditional?
			target.needsUpdate = true;
		}

		return this;
	}
}
