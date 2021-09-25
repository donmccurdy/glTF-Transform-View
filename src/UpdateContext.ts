import { Accessor as AccessorDef, Material as MaterialDef, Mesh as MeshDef, Node as NodeDef, Primitive as PrimitiveDef, Property as PropertyDef, PropertyType, Scene as SceneDef, Texture as TextureDef } from '@gltf-transform/core';
import { VariantCache } from './variants/VariantCache';
import { AccessorBinding, Binding, MaterialBinding, MeshBinding, NodeBinding, PrimitiveBinding, SceneBinding, TextureBinding } from './bindings';
import { createMaterialVariant, MaterialParams, SourceMaterial, VariantMaterial, updateMaterialVariant } from './variants/material';
import { Texture } from 'three';
import { createTextureVariant, TextureParams, updateTextureVariant } from './variants/texture';
import { pool } from './ObjectPool';

// export enum UpdateMask {
// 	SHALLOW = 0x0000,
// 	DEEP = 0x1000,
// 	TEXTURE_DATA = 0x0100,
// 	VERTEX_DATA = 0x00100,
// }

// TODO(bug): Deep syncs are pretty messy... how do we prevent updating the same (reused) Mesh many times? Front recursion?
export class UpdateContext {
	public updateID = 1;
	public deep = true;

	private _bindings = new Set<Binding<PropertyDef, any>>();
	private _sourceBindings = new WeakMap<PropertyDef, Binding<PropertyDef, any>>();

	public textureCache = new VariantCache<Texture, Texture, TextureParams>(
		'TextureCache',
		createTextureVariant,
		updateTextureVariant,
		(texture) => pool.release(texture).dispose(),
	);
	public materialCache = new VariantCache<SourceMaterial, VariantMaterial, MaterialParams>(
		'MaterialCache',
		createMaterialVariant,
		updateMaterialVariant,
		(material) => pool.release(material).dispose()
	);

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

	public startUpdate(deep = false) {
		this.updateID++;
		this.deep = deep;
	}

	public endUpdate() {
		this.textureCache.flush();
		// this.textureCache._debug();
		this.materialCache.flush();
		// this.materialCache._debug();
	}

	public dispose(): void {
		for (const renderer of this._bindings) {
			renderer.dispose();
		}
	}
}
