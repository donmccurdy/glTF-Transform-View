import { Group, Line, LineLoop, LineSegments, Material, Mesh, Object3D, Points, Texture } from 'three';
import { Document, Scene as SceneDef, Node as NodeDef, Material as MaterialDef, Mesh as MeshDef, Primitive as PrimitiveDef, Texture as TextureDef } from '@gltf-transform/core';
import { UpdateContext } from './UpdateContext';
import { DefaultImageProvider } from './ImageProvider';

/**
 * Constructs a three.js subtree from a glTF-Transform Document, and maintains a
 * 1:1 mapping between every three.js/glTF object pair. Supports full and partial
 * updates with significantly lower latency than serializing and reloading to
 * THREE.GLTFLoader each time.
 */
export class DocumentView {
	/** @internal */ private _document: Document;
	/** @internal */ private _context: UpdateContext;

	/** Constructs a new DocumentView. */
	constructor(document: Document) {
		this._document = document;
		this._context = new UpdateContext();
	}

	/**
	 * For a given glTF-Transform Scene definition, returns an Object3D root note. Successive calls
	 * with the same input will yield the same output Object3D instance.
	 */
	public view(source: SceneDef): Object3D {
		return this._context.bind(source).value;
	}

	/** For a given source glTF-Transform Property definition, returns a list of rendered three.js objects. */
	public viewAll(source: MaterialDef): Material[];
	public viewAll(source: TextureDef): Texture[];
	public viewAll(source: PrimitiveDef): (Mesh | Points | Line | LineLoop | LineSegments)[];
	public viewAll(source: SceneDef | NodeDef | MeshDef): Object3D[];
	public viewAll(source: SceneDef | NodeDef | MeshDef | PrimitiveDef | MaterialDef | TextureDef): (Mesh | Points | Line | LineLoop | LineSegments | Group | Object3D | Material | Texture)[] {
		if (source instanceof SceneDef
			|| source instanceof NodeDef
			|| source instanceof MeshDef
			|| source instanceof PrimitiveDef
			|| source instanceof MaterialDef
			|| source instanceof TextureDef) {
			throw new Error('Not implemented');
			// return this._context.findValues(source as any);
		}
		throw new Error('DocumentView: viewAll(...) supports only Scene, Node, Mesh, Primitive, and Material inputs.');
	}

	/** For a given Object3D target, finds the source glTF-Transform Property definition. */
	public source(view: Mesh): PrimitiveDef | null
	public source(view: Object3D): NodeDef | SceneDef | MeshDef | null
	public source(view: Mesh | Group | Object3D): PrimitiveDef | MeshDef | NodeDef | SceneDef | null {
		if (view instanceof Object3D) {
			throw new Error('Not implemented');
			// return this._context.findDef(view) as PrimitiveDef | MeshDef | NodeDef | SceneDef;
		}
		throw new Error('DocumentView: source(...) supports only Object3D inputs.');
	}

	public stats(): Record<string, number> {
		return this._context.stats();
	}

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
