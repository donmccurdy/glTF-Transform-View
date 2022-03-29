import { Accessor as AccessorDef, ExtensionProperty as ExtensionPropertyDef, Material as MaterialDef, Mesh as MeshDef, Node as NodeDef, Primitive as PrimitiveDef, Property as PropertyDef, PropertyType, Scene as SceneDef, Texture as TextureDef } from '@gltf-transform/core';
import { Object3D, BufferAttribute, Group, Mesh } from 'three';
import { AccessorBinding, Binding, ExtensionBinding, MaterialBinding, MeshBinding, NodeBinding, PrimitiveBinding, SceneBinding, TextureBinding } from './bindings';
import { DefaultImageProvider, ImageProvider, NullImageProvider } from './ImageProvider';
import { MaterialPool, SingleUserPool, Pool, TexturePool } from './pools';

export class UpdateContext {
	private _bindings = new Set<Binding<PropertyDef, any>>();
	private _defBindings = new WeakMap<PropertyDef, Binding<PropertyDef, any>>();

	readonly accessorPool = new Pool<BufferAttribute>();
	readonly extensionPool = new Pool<ExtensionPropertyDef>();
	readonly materialPool = new MaterialPool();
	readonly meshPool = new SingleUserPool<Group>();
	readonly nodePool = new Pool<Object3D>();
	readonly primitivePool = new SingleUserPool<Mesh>();
	readonly scenePool = new Pool<Group>();
	readonly texturePool = new TexturePool();

	public imageProvider: ImageProvider = new NullImageProvider();

	public setImageProvider(provider: DefaultImageProvider): void {
		this.imageProvider = provider;
	}

	private _addBinding(binding: Binding<PropertyDef, any>): void {
		const source = binding.def;
		this._bindings.add(binding);
		this._defBindings.set(source, binding);
		source.addEventListener('dispose', () => {
			this._bindings.delete(binding);
			this._defBindings.delete(source);
		});
	}

	public bind(def: null): null;
	public bind(def: AccessorDef): AccessorBinding;
	public bind(def: MaterialDef): MaterialBinding;
	public bind(def: MeshDef): MeshBinding;
	public bind(def: NodeDef): NodeBinding;
	public bind(def: PrimitiveDef): PrimitiveBinding;
	public bind(def: SceneDef): SceneBinding;
	public bind(def: PropertyDef): Binding<PropertyDef, any>;
	public bind(def: PropertyDef | null): Binding<PropertyDef, any> | null {
		if (!def) return null;
		if (this._defBindings.has(def)) {
			return this._defBindings.get(def)!;
		}

		let binding: Binding<PropertyDef, any>;
		switch (def.propertyType) {
			case PropertyType.ACCESSOR:
				binding = new AccessorBinding(this, def as AccessorDef);
				break;
			case PropertyType.MATERIAL:
				binding = new MaterialBinding(this, def as MaterialDef);
				break;
			case PropertyType.MESH:
				binding = new MeshBinding(this, def as MeshDef);
				break;
			case PropertyType.NODE:
				binding = new NodeBinding(this, def as NodeDef);
				break;
			case PropertyType.PRIMITIVE:
				binding = new PrimitiveBinding(this, def as PrimitiveDef);
				break;
			case PropertyType.SCENE:
				binding = new SceneBinding(this, def as SceneDef);
				break;
			case PropertyType.TEXTURE:
				binding = new TextureBinding(this, def as TextureDef);
				break;
			default: {
				if (def instanceof ExtensionPropertyDef) {
					binding = new ExtensionBinding(this, def as ExtensionPropertyDef);
				} else {
					throw new Error(`Unimplemented type: ${def.propertyType}`);
				}
			}
		}

		binding.update();
		this._addBinding(binding);
		return binding;
	}

	public weakBind(source: PropertyDef): Binding<PropertyDef, any> | null {
		return this._defBindings.get(source) || null;
	}

	public gc() {
		// TODO(cleanup)
		// this.textureMap.flush();
		// this.materialMap.flush();
		// this.object3DMap.flush();
	}

	/**
	 * Given a target object (currently any THREE.Object3D), finds and returns the source
	 * glTF-Transform Property definition.
	 */
	// public findDef(target: Object3D): PropertyDef | null {
	// 	if (target === null) return null;

	// 	let base;

	// 	if (base = this.primitivePool.findBase(target))
	// 	const base = this.object3DMap.findBase(target) || target;
	// 	for (const binding of this._bindings) {
	// 		if (binding.value === target || binding.value === base) {
	// 			return binding.def;
	// 		}
	// 	}

	// 	return null;
	// }

	/**
	 * Given a source object (currently anything rendered as THREE.Object3D), finds and returns
	 * the list of output THREE.Object3D instances.
	 */
	// public findValues(def: TextureDef): Texture[]
	// public findValues(def: MaterialDef): Material[]
	// public findValues(def: SceneDef | NodeDef | MeshDef | PrimitiveDef): Object3D[]
	// public findValues(def: SceneDef | NodeDef | MeshDef | PrimitiveDef | MaterialDef | TextureDef): (Object3D | Material | Texture)[] {
	// 	const binding = this._defBindings.get(def);
	// 	if (!binding) return [];

	// 	if (def instanceof SceneDef || def instanceof NodeDef) {
	// 		return [binding.value];
	// 	} else if (def instanceof MeshDef || def instanceof PrimitiveDef) {
	// 		return this.object3DMap.listVariants(binding.value);
	// 	} else if (def instanceof MaterialDef) {
	// 		this.materialMap.listVariants(binding.value);
	// 	} else if (def instanceof TextureDef) {
	// 		this.textureMap.listVariants(binding.value);
	// 	}

	// 	throw new Error(`GLTFRenderer: Lookup type "${def.propertyType}" not implemented.`);
	// }

	public dispose(): void {
		for (const renderer of this._bindings) {
			renderer.dispose();
		}
		this.accessorPool.dispose();
		this.materialPool.dispose();
		this.meshPool.dispose();
		this.nodePool.dispose();
		this.primitivePool.dispose();
		this.scenePool.dispose();
		this.texturePool.dispose();
		this._bindings.clear();
	}
}
