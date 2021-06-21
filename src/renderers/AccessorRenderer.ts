import { BufferAttribute } from 'three';
import { Accessor as AccessorDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { Renderer } from './Renderer';

export class AccessorRenderer extends Renderer<AccessorDef, BufferAttribute> {
	public constructor(context: UpdateContext, source: AccessorDef) {
		super(context, source, AccessorRenderer.createTarget(source));
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
			this.next(AccessorRenderer.createTarget(source));
		} else {
			// TODO(feat): Conditional?
			target.needsUpdate = true;
		}

		return this;
	}
}
