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
	/** @internal */ private _document: Document;
	/** @internal */ private _context: UpdateContext;
	/** @internal */ private _sceneBinding: SceneBinding;

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

		const dirtyList: Property[] = [property];
		const dirtySet = new WeakSet(dirtyList);

		while (dirtyList.length > 0) {
			const next = dirtyList.pop()!;
			dirtySet.delete(next);

			const nextBinding = this._context.weakBind(next);
			if (!nextBinding) continue;

			console.log(`update::${next.propertyType}::${next.getName()}`);
			nextBinding.update();

			// TODO(perf): Not all child changes should invalidate the parent.
			for (const parent of next.listParents()) {
				if (!dirtySet.has(parent)) {
					dirtyList.push(parent);
					dirtySet.add(parent);
				}
			}

			this._context.deep = false; // Only affects first update.
		}

		this._context.endUpdate();
	}

	/**
	 * Destroys the renderer and cleans up its resources.
	 *
	 * Lifecycle: For resources associated with...
	 * - ...used Properties, dispose with renderer.
	 * - ...unused Properties, dispose with renderer.
	 * - ...disposed Properties, dispose immediately.
	 */
	public dispose(): void {
		this._context.dispose();
	}
}
