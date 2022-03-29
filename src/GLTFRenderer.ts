import { Group, Line, LineLoop, LineSegments, Material, Mesh, Object3D, Points, Texture } from 'three';
import { Document, Scene as SceneDef, Node as NodeDef, Material as MaterialDef, Mesh as MeshDef, Primitive as PrimitiveDef, Texture as TextureDef } from '@gltf-transform/core';
import { UpdateContext } from './UpdateContext';
import { DefaultImageProvider } from './ImageProvider';

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
	 *
	 * TODO(api): Not as confident about this API anymore. Why is everything gated
	 * on a Scene? What about rendering materials, textures, meshes? Exposing something
	 * more like .bind(source) and .weakBind(source) may be better, with the caveat that
	 * they may be fully replaced rather than modified in place at times. Only certain
	 * targets are "stable". Expose a subscription-like API? Probably not right now.
	 */
	public render(property: SceneDef): Object3D {
		return this._context.bind(property).value;
	}

	/** For a given source glTF-Transform Property definition, returns a list of rendered three.js objects. */
	// public findValues(property: MaterialDef): Material[];
	// public findValues(property: TextureDef): Texture[];
	// public findValues(property: PrimitiveDef): (Mesh | Points | Line | LineLoop | LineSegments)[];
	// public findValues(property: SceneDef | NodeDef | MeshDef): Object3D[];
	// public findValues(property: SceneDef | NodeDef | MeshDef | PrimitiveDef | MaterialDef | TextureDef): (Mesh | Points | Line | LineLoop | LineSegments | Group | Object3D | Material | Texture)[] {
	// 	if (property instanceof SceneDef
	// 		|| property instanceof NodeDef
	// 		|| property instanceof MeshDef
	// 		|| property instanceof PrimitiveDef
	// 		|| property instanceof MaterialDef
	// 		|| property instanceof TextureDef) {
	// 		return this._context.findValues(property as any);
	// 	}
	// 	throw new Error('GLTFRenderer: listTargets(...) supports only Scene, Node, Mesh, Primitive, and Material inputs.');
	// }

	/** For a given Object3D target, finds the source glTF-Transform Property definition. */
	// public findDef(target: Mesh): PrimitiveDef | null
	// public findDef(target: Object3D): NodeDef | SceneDef | MeshDef | null
	// public findDef(target: Mesh | Group | Object3D): PrimitiveDef | MeshDef | NodeDef | SceneDef | null {
	// 	if (target instanceof Object3D) {
	// 		return this._context.findDef(target) as PrimitiveDef | MeshDef | NodeDef | SceneDef;
	// 	}
	// 	throw new Error('GLTFRenderer: findDef(...) supports only Object3D inputs.');
	// }

	public gc(): void {
		this._context.gc();
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

	public setImageProvider(provider: DefaultImageProvider): this {
		this._context.setImageProvider(provider);
		return this;
	}
}
