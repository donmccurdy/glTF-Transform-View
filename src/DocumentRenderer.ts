import { Object3D } from 'three';
import { Document, Property } from '@gltf-transform/core';
import { SyncContext } from './SyncContext';
import { SceneSyncPair } from './SyncPair';

export class DocumentRenderer {
	private _document: Document;
	private _context: SyncContext;
	private _scenePair: SceneSyncPair;

	constructor(document: Document) {
		this._document = document;
		this._context = new SyncContext();
		this._scenePair = this._context.pair(document.getRoot().listScenes().pop()!);
	}

	public toObject3D(): Object3D {
		return this._scenePair.target;
	}

	public sync(): void {
		this._scenePair.sync();
	}

	public update(property: Property): void {
		this._context.pair(property).sync();
	}
}
