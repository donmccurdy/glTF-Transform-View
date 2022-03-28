import type { ExtensionProperty as ExtensionPropertyDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { Binding } from './Binding';

export class ExtensionBinding extends Binding<ExtensionPropertyDef, ExtensionPropertyDef> {
	public constructor(context: UpdateContext, def: ExtensionPropertyDef) {
		super(context, def, def, context.extensionPool);
	}
	public update(): this {
		return this.publishAll(); // TODO(perf)
	}
}
