import { Accessor as AccessorDef, Material as MaterialDef, Mesh as MeshDef, Node as NodeDef, Primitive as PrimitiveDef, Property as PropertyDef, PropertyType, Scene as SceneDef, Texture as TextureDef } from '@gltf-transform/core';
import { AccessorBinding, Binding, MaterialBinding, MeshBinding, NodeBinding, PrimitiveBinding, SceneBinding, TextureBinding } from './bindings';
import { MaterialMap, Object3DMap, TextureMap } from './maps';

// TODO(perf): Support update mask.
//
// export enum UpdateMask {
// 	SHALLOW = 0x0000,
// 	DEEP = 0x1000,
// 	TEXTURE_DATA = 0x0100,
// 	VERTEX_DATA = 0x00100,
// }

export class UpdateContext {
	public updateID = 1;
	public deep = true;

	private _bindings = new Set<Binding<PropertyDef, any>>();
	private _sourceBindings = new WeakMap<PropertyDef, Binding<PropertyDef, any>>();

	public textureMap = new TextureMap('TextureMap');
	public materialMap = new MaterialMap('MaterialMap');
	public object3DMap = new Object3DMap('Object3DMap');

	private _addBinding(renderer: Binding<PropertyDef, any>): void {
		this._bindings.add(renderer);
		this._sourceBindings.set(renderer.source, renderer);
	}

	public bind(source: null): null;
	public bind(source: AccessorDef): AccessorBinding;
	public bind(source: MaterialDef): MaterialBinding;
	public bind(source: MeshDef): MeshBinding;
	public bind(source: NodeDef): NodeBinding;
	public bind(source: PrimitiveDef): PrimitiveBinding;
	public bind(source: SceneDef): SceneBinding;
	public bind(source: PropertyDef): Binding<PropertyDef, any>;
	public bind(source: PropertyDef | null): Binding<PropertyDef, any> | null {
		if (!source) return null;
		if (this._sourceBindings.has(source)) {
			return this._sourceBindings.get(source)!;
		}

		let binding: Binding<PropertyDef, any>;
		switch (source.propertyType) {
			case PropertyType.ACCESSOR:
				binding = new AccessorBinding(this, source as AccessorDef);
				break;
			case PropertyType.MATERIAL:
				binding = new MaterialBinding(this, source as MaterialDef);
				break;
			case PropertyType.MESH:
				binding = new MeshBinding(this, source as MeshDef);
				break;
			case PropertyType.NODE:
				binding = new NodeBinding(this, source as NodeDef);
				break;
			case PropertyType.PRIMITIVE:
				binding = new PrimitiveBinding(this, source as PrimitiveDef);
				break;
			case PropertyType.SCENE:
				binding = new SceneBinding(this, source as SceneDef);
				break;
			case PropertyType.TEXTURE:
				binding = new TextureBinding(this, source as TextureDef);
				break;
			default:
				throw new Error(`Unimplemented type: ${source.propertyType}`);
		}

		binding.update();
		this._addBinding(binding);
		return binding;
	}

	public weakBind(source: PropertyDef): Binding<PropertyDef, any> | null {
		return this._sourceBindings.get(source) || null;
	}

	public startUpdate(deep = false) {
		this.updateID++;
		this.deep = deep;
	}

	public endUpdate() {
		this.textureMap.flush();
		// this.textureCache._debug();
		this.materialMap.flush();
		// this.materialCache._debug();
		this.object3DMap.flush();
		// this.meshCache._debug();
	}

	public dispose(): void {
		for (const renderer of this._bindings) {
			renderer.dispose();
		}
		this.textureMap.dispose();
		this.materialMap.dispose();
		this.object3DMap.dispose();
		this._bindings.clear();
	}
}
