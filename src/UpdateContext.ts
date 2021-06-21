import { Accessor as AccessorDef, Material as MaterialDef, Mesh as MeshDef, Node as NodeDef, Primitive as PrimitiveDef, Property as PropertyDef, PropertyType, Scene as SceneDef, Texture as TextureDef } from '@gltf-transform/core';
import { AccessorRenderer, MaterialRenderer, MeshRenderer, NodeRenderer, PrimitiveRenderer, Renderer, SceneRenderer, TextureRenderer } from './renderers';

// export enum UpdateMask {
// 	SHALLOW = 0x0000,
// 	DEEP = 0x1000,
// 	TEXTURE_DATA = 0x0100,
// 	VERTEX_DATA = 0x00100,
// }

// TODO(bug): Deep syncs are pretty messy... how do we prevent updating the same (reused) Mesh many times? Front recursion?
export class UpdateContext {
	public id = 1;
	public deep = true;

	private renderers = new Set<Renderer<PropertyDef, any>>();
	private _sourceMap = new WeakMap<PropertyDef, Renderer<PropertyDef, any>>();

	public add(renderer: Renderer<PropertyDef, any>): void {
		this.renderers.add(renderer);
		this._sourceMap.set(renderer.source, renderer);
	}

	// TODO(cleanup): .bind() -> PropertyBinding?
	public get(source: null): null;
	public get(source: AccessorDef): AccessorRenderer;
	public get(source: MaterialDef): MaterialRenderer;
	public get(source: MeshDef): MeshRenderer;
	public get(source: NodeDef): NodeRenderer;
	public get(source: PrimitiveDef): PrimitiveRenderer;
	public get(source: SceneDef): SceneRenderer;
	public get(source: PropertyDef): Renderer<PropertyDef, any>;
	public get(source: PropertyDef | null): Renderer<PropertyDef, any> | null {
		if (!source) return null;
		if (this._sourceMap.has(source)) return this._sourceMap.get(source)!;

		switch (source.propertyType) {
			case PropertyType.ACCESSOR:
				return new AccessorRenderer(this, source as AccessorDef).update();
			case PropertyType.MATERIAL:
				return new MaterialRenderer(this, source as MaterialDef).update();
			case PropertyType.MESH:
				return new MeshRenderer(this, source as MeshDef).update();
			case PropertyType.NODE:
				return new NodeRenderer(this, source as NodeDef).update();
			case PropertyType.PRIMITIVE:
				return new PrimitiveRenderer(this, source as PrimitiveDef).update();
			case PropertyType.SCENE:
				return new SceneRenderer(this, source as SceneDef).update();
			case PropertyType.TEXTURE:
				return new TextureRenderer(this, source as TextureDef).update();
			default:
				throw new Error(`Unimplemented type: ${source.propertyType}`);
		}
	}

	public dispose(): void {
		for (const renderer of this.renderers) {
			renderer.dispose();
		}
	}
}
