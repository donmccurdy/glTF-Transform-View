import { Group, Line, LineLoop, LineSegments, Material, Mesh, Object3D, Points, Texture } from 'three';
import { Document, Property as PropertyDef, Scene as SceneDef, Node as NodeDef, Material as MaterialDef, Mesh as MeshDef, Primitive as PrimitiveDef, Texture as TextureDef } from '@gltf-transform/core';
import { UpdateContext } from './UpdateContext';

/**
 * Constructs a THREE.Object3D from a glTF-Transform Document, and maintains a
 * 1:1 mapping between every three.js/glTF object pair. Supports full and partial
 * updates with significantly lower latency than serializing and reloading to
 * THREE.GLTFLoader each time.
 */
export class GLTFRenderer {
	/** @internal */ private _document: Document;
	/** @internal */ private _context: UpdateContext;

	/** Constructs a new GLTFRenderer. */
	constructor(document: Document) {
		this._document = document;
		this._context = new UpdateContext();
	}

	/**
	 * For a given glTF-Transform Scene definition, returns an Object3D root note. Successive calls
	 * with the same input will yield the same output Object3D instance.
	 */
	public render(property: SceneDef): Object3D {
		return this._context.bind(property).value;
	}

	/** For a given source glTF-Transform Property definition, returns a list of rendered three.js objects. */
	public findTargets(property: MaterialDef): Material[];
	public findTargets(property: TextureDef): Texture[];
	public findTargets(property: PrimitiveDef): (Mesh | Points | Line | LineLoop | LineSegments)[];
	public findTargets(property: SceneDef | NodeDef | MeshDef): Object3D[];
	public findTargets(property: SceneDef | NodeDef | MeshDef | PrimitiveDef | MaterialDef | TextureDef): (Mesh | Points | Line | LineLoop | LineSegments | Group | Object3D | Material | Texture)[] {
		if (property instanceof SceneDef
			|| property instanceof NodeDef
			|| property instanceof MeshDef
			|| property instanceof PrimitiveDef
			|| property instanceof MaterialDef
			|| property instanceof TextureDef) {
			return this._context.findTargets(property as any);
		}
		throw new Error('GLTFRenderer: listTargets(...) supports only Scene, Node, Mesh, Primitive, and Material inputs.');
	}

	/** For a given Object3D target, finds the source glTF-Transform Property definition. */
	public findSource(target: Mesh): PrimitiveDef | null
	public findSource(target: Object3D): NodeDef | SceneDef | MeshDef | null
	public findSource(target: Mesh | Group | Object3D): PrimitiveDef | MeshDef | NodeDef | SceneDef | null {
		if (target instanceof Object3D) {
			return this._context.findSource(target) as PrimitiveDef | MeshDef | NodeDef | SceneDef;
		}
		throw new Error('GLTFRenderer: findSource(...) supports only Object3D inputs.');
	}

	/**
	 * Performs a partial update of the scene. If shallow, affects only the
	 * given object. If deep, affects the given object and its descendants in
	 * the resource dependency graph.
	 */
	public update(property: PropertyDef, deep = false): void {
		this._context.startUpdate(deep);

		const dirtyList: PropertyDef[] = [property];
		const dirtySet = new WeakSet(dirtyList);

		while (dirtyList.length > 0) {
			const next = dirtyList.pop()!;
			dirtySet.delete(next);

			const nextBinding = this._context.weakBind(next);
			if (!nextBinding) continue;
			nextBinding.update();

			// TODO(perf): Selective invalidation and early exit.
			for (const parent of next.listParents()) {
				if (!dirtySet.has(parent)) {
					dirtyList.push(parent);
					dirtySet.add(parent);
				}
			}

			this._context.deep = false; // Only deep for first property.
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
