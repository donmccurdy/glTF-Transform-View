import type { ExtensionProperty as ExtensionPropertyDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { Binding } from './Binding';

export class ExtensionBinding extends Binding<ExtensionPropertyDef, ExtensionPropertyDef> {
	constructor(context: UpdateContext, def: ExtensionPropertyDef) {
		super(context, def, def, context.extensionPool);
	}
	update() {}
}
