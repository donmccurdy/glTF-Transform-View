import { PropertyType, ExtensionProperty as ExtensionPropertyDef } from '@gltf-transform/core';
import type { Accessor as AccessorDef, Material as MaterialDef, Mesh as MeshDef, Node as NodeDef, Primitive as PrimitiveDef, Property as PropertyDef, Scene as SceneDef, Texture as TextureDef } from '@gltf-transform/core';
import type { Object3D, BufferAttribute, Group, Texture, Material } from 'three';
import { AccessorSubject, Subject, ExtensionSubject, MaterialSubject, MeshSubject, NodeSubject, PrimitiveSubject, SceneSubject, TextureSubject } from './subjects';
import type { MeshLike } from './constants';
import { DefaultImageProvider, ImageProvider, NullImageProvider } from './ImageProvider';
import { MaterialPool, SingleUserPool, Pool, TexturePool } from './pools';

/** @internal */
export class UpdateContext {
	private _disposed = false;
	private _subjects = new Map<PropertyDef, Subject<PropertyDef, any>>();
	private _outputValues = new WeakMap<PropertyDef, Set<object>>();
	private _outputValuesInverse = new WeakMap<object, PropertyDef>();

	readonly accessorPool = new Pool<BufferAttribute>('accessors');
	readonly extensionPool = new Pool<ExtensionPropertyDef>('extensions');
	readonly materialPool = new MaterialPool('materials');
	readonly meshPool = new SingleUserPool<Group>('meshes');
	readonly nodePool = new Pool<Object3D>('nodes');
	readonly primitivePool = new SingleUserPool<MeshLike>('primitives');
	readonly scenePool = new Pool<Group>('scenes');
	readonly texturePool = new TexturePool('textures');

	public imageProvider: ImageProvider = new NullImageProvider();

	setImageProvider(provider: DefaultImageProvider): void {
		this.imageProvider = provider;
	}

	private _addSubject(subject: Subject<PropertyDef, any>): void {
		const def = subject.def;
		this._subjects.set(def, subject);
		def.addEventListener('dispose', () => {
			this._subjects.delete(def);
		});
	}

	bind(def: null): null;
	bind(def: AccessorDef): AccessorSubject;
	bind(def: MaterialDef): MaterialSubject;
	bind(def: MeshDef): MeshSubject;
	bind(def: NodeDef): NodeSubject;
	bind(def: PrimitiveDef): PrimitiveSubject;
	bind(def: SceneDef): SceneSubject;
	bind(def: PropertyDef): Subject<PropertyDef, any>;
	bind(def: PropertyDef | null): Subject<PropertyDef, any> | null {
		if (!def) return null;
		if (this._subjects.has(def)) return this._subjects.get(def)!;

		let subject: Subject<PropertyDef, any>;
		switch (def.propertyType) {
			case PropertyType.ACCESSOR:
				subject = new AccessorSubject(this, def as AccessorDef);
				break;
			case PropertyType.MATERIAL:
				subject = new MaterialSubject(this, def as MaterialDef);
				break;
			case PropertyType.MESH:
				subject = new MeshSubject(this, def as MeshDef);
				break;
			case PropertyType.NODE:
				subject = new NodeSubject(this, def as NodeDef);
				break;
			case PropertyType.PRIMITIVE:
				subject = new PrimitiveSubject(this, def as PrimitiveDef);
				break;
			case PropertyType.SCENE:
				subject = new SceneSubject(this, def as SceneDef);
				break;
			case PropertyType.TEXTURE:
				subject = new TextureSubject(this, def as TextureDef);
				break;
			default: {
				if (def instanceof ExtensionPropertyDef) {
					subject = new ExtensionSubject(this, def as ExtensionPropertyDef);
				} else {
					throw new Error(`Unimplemented type: ${def.propertyType}`);
				}
			}
		}

		subject.update();
		this._addSubject(subject);
		return subject;
	}

	recordOutputValue(def: PropertyDef, value: object) {
		const outputValues = this._outputValues.get(def) || new Set();
		outputValues.add(value);
		this._outputValues.set(def, outputValues);
		this._outputValuesInverse.set(value, def);
	}

	stats() {
		return {
			accessors: this.accessorPool.size(),
			extensions: this.extensionPool.size(),
			materials: this.materialPool.size(),
			meshes: this.meshPool.size(),
			nodes: this.nodePool.size(),
			primitives: this.primitivePool.size(),
			scenes: this.scenePool.size(),
			textures: this.texturePool.size(),
		};
	}

	gc() {
		this.accessorPool.gc();
		this.extensionPool.gc();
		this.materialPool.gc();
		this.meshPool.gc();
		this.nodePool.gc();
		this.primitivePool.gc();
		this.scenePool.gc();
		this.texturePool.gc();
	}

	/**
	 * Given a target object (currently any THREE.Object3D), finds and returns the source
	 * glTF-Transform Property definition.
	 */
	findDef(target: Texture): TextureDef | null
	findDef(target: Material): MaterialDef | null
	findDef(target: MeshLike): PrimitiveDef | null
	findDef(target: Object3D): SceneDef | NodeDef | MeshDef | null
	findDef(target: object): PropertyDef | null {
		return this._outputValuesInverse.get(target) || null;
	}

	/**
	 * Given a source object (currently anything rendered as THREE.Object3D), finds and returns
	 * the list of output THREE.Object3D instances.
	 */
	findValues(def: TextureDef): Texture[];
	findValues(def: MaterialDef): Material[];
	findValues(def: PrimitiveDef): MeshLike[];
	findValues(def: SceneDef | NodeDef | MeshDef): Object3D[];
	findValues(def: PropertyDef): object[] {
		return Array.from(this._outputValues.get(def) || []);
	}

	isDisposed(): boolean {
		return this._disposed;
	}

	dispose(): void {
		// First, to prevent updates during disposal.
		this._disposed = true;

		for (const [_, subject] of this._subjects) subject.dispose();
		this._subjects.clear();

		// Last, to clean up anything left after disposal.
		this.accessorPool.dispose();
		this.materialPool.dispose();
		this.meshPool.dispose();
		this.nodePool.dispose();
		this.primitivePool.dispose();
		this.scenePool.dispose();
		this.texturePool.dispose();
	}
}
