import { Group, Material, Object3D, Texture } from 'three';
import { Document, Scene as SceneDef, Node as NodeDef, Material as MaterialDef, Mesh as MeshDef, Primitive as PrimitiveDef, Property as PropertyDef, Texture as TextureDef } from '@gltf-transform/core';
import { Light as LightDef } from '@gltf-transform/extensions';
import { DocumentViewConfig, DocumentViewImpl } from './DocumentViewImpl';
import { LightLike, MeshLike } from './constants';

/**
 * Constructs a three.js subtree from a glTF-Transform Document, and maintains a
 * 1:1 mapping between every three.js/glTF object pair. Supports full and partial
 * updates with significantly lower latency than serializing and reloading to
 * THREE.GLTFLoader each time.
 */
export class DocumentView {
	/** @internal */ private _ready = false;
	/** @internal */ private _document: Document;
	/** @internal */ private _impl: DocumentViewImpl;

	/** Constructs a new DocumentView. */
	public constructor(document: Document, config = {} as DocumentViewConfig) {
		this._document = document;
		this._impl = new DocumentViewImpl(config);
		this._ready = true;
	}

	/**
	 * For a given glTF-Transform Scene definition, returns an Object3D root note. Successive calls
	 * with the same input will yield the same output Object3D instance.
	 */
	public view(def: SceneDef): Group {
		assert(this._ready);
		const value = this._impl.bind(def).value as Group;
		this._impl.recordOutputValue(def, value);
		return value;
	}

	/** For a given source glTF-Transform Property definition, returns a list of rendered three.js objects. */
	public listViews(source: TextureDef): Texture[];
	public listViews(source: LightDef): LightLike[];
	public listViews(source: MaterialDef): Material[];
	public listViews(source: PrimitiveDef): MeshLike[];
	public listViews(source: SceneDef | NodeDef | MeshDef): Object3D[];
	public listViews(source: PropertyDef): object[] {
		assert(this._ready);
		return this._impl.findValues(source as any);
	}

	/** For a given Object3D target, finds the source glTF-Transform Property definition. */
	public getProperty(view: Texture): TextureDef | null
	public getProperty(view: LightLike): LightDef | null
	public getProperty(view: Material): MaterialDef | null
	public getProperty(view: MeshLike): PrimitiveDef | null
	public getProperty(view: Object3D): MeshDef | NodeDef | SceneDef | null
	public getProperty(view: object): PropertyDef | null {
		assert(this._ready);
		return this._impl.findDef(view as any);
	}

	public stats(): Record<string, number> {
		assert(this._ready);
		return this._impl.stats();
	}

	public gc(): void {
		assert(this._ready);
		this._impl.gc();
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
		assert(this._ready);
		this._impl.dispose();
	}
}

function assert(ready: boolean) {
	if (!ready) {
		throw new Error('DocumentView must be initialized before use.');
	}
}
