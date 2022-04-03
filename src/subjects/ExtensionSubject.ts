import type { ExtensionProperty as ExtensionPropertyDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { Subject } from './Subject';

export class ExtensionSubject extends Subject<ExtensionPropertyDef, ExtensionPropertyDef> {
	constructor(context: UpdateContext, def: ExtensionPropertyDef) {
		super(context, def, def, context.extensionPool);
	}
	update() {}
}
