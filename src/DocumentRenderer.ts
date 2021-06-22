import { Object3D } from 'three';
import { Document, Property } from '@gltf-transform/core';
import { UpdateContext } from './UpdateContext';
import { SceneBinding } from './bindings';

/**
 * Constructs a THREE.Object3D from a glTF-Transform Document, and maintains a
 * 1:1 mapping between every three.js/glTF object pair. Supports full and partial
 * updates with significantly lower latency than serializing and reloading to
 * THREE.GLTFLoader each time.
 */
export class DocumentRenderer {
	private _document: Document;
	private _context: UpdateContext;
	private _sceneBinding: SceneBinding;

	/** Constructs a new DocumentRenderer. */
	constructor(document: Document) {
		this._document = document;
		this._context = new UpdateContext();
		this._sceneBinding = this._context.bind(document.getRoot().listScenes().pop()!);
	}

	/**
	 * Returns root THREE.Object3D instance for the document. Currently
	 * based on the first Scene in the Document; later scenes are ignored.
	 */
	public toObject3D(): Object3D {
		return this._sceneBinding.value;
	}

	/**
	 * Performs a deep update of the entire scene.
	 */
	public updateAll(): void {
		this._context.startUpdate(true);
		this._sceneBinding.update();
		this._context.endUpdate();
	}

	/**
	 * Performs a partial update of the scene. If shallow, affects only the
	 * given object. If deep, affects the given object and its descendants in
	 * the resource dependency graph.
	 */
	public update(property: Property, deep = false): void {
		this._context.startUpdate(deep);
		this._context.bind(property).update();
		this._context.endUpdate();
	}

	/** Destroys the renderer and cleans up its resources. */
	public dispose(): void {
		this._context.dispose();
	}
}
