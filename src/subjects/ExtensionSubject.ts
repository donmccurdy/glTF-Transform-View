import type { ExtensionProperty as ExtensionPropertyDef } from '@gltf-transform/core';
import type { DocumentViewImpl } from '../DocumentViewImpl';
import { Subject } from './Subject';

/** @internal */
export class ExtensionSubject extends Subject<ExtensionPropertyDef, ExtensionPropertyDef> {
	constructor(documentView: DocumentViewImpl, def: ExtensionPropertyDef) {
		super(documentView, def, def, documentView.extensionPool);
	}
	update() {}
}
