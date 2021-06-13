import { Object3D } from 'three';
import { Document, Property } from '@gltf-transform/core';
import { SyncContext } from './SyncContext';
import { SceneSyncPair } from './SyncPair';

/**
 * Constructs a THREE.Object3D from a glTF-Transform Document, and maintains a
 * 1:1 mapping between every three.js/glTF object pair. Supports full and partial
 * updates with significantly lower latency than serializing and reloading to
 * THREE.GLTFLoader each time.
 */
export class DocumentRenderer {
	private _document: Document;
	private _context: SyncContext;
	private _scenePair: SceneSyncPair;

	/** Constructs a new DocumentRenderer. */
	constructor(document: Document) {
		this._document = document;
		this._context = new SyncContext();
		this._scenePair = this._context.pair(document.getRoot().listScenes().pop()!);
	}

	/**
	 * Returns root THREE.Object3D instance for the document. Currently
	 * based on the first Scene in the Document; later scenes are ignored.
	 */
	public toObject3D(): Object3D {
		return this._scenePair.target;
	}

	/**
	 * Performs a deep update of the entire scene.
	 */
	public updateAll(): void {
		this._scenePair.sync(true);
	}

	/**
	 * Performs a partial update of the scene. If shallow, affects only the
	 * given object. If deep, affects the given object and its descendants in
	 * the resource dependency graph.
	 */
	public update(property: Property, deep = false): void {
		this._context.pair(property).sync(deep);
	}
}
