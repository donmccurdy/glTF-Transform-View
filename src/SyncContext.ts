import { Accessor as AccessorDef, Mesh as MeshDef, Node as NodeDef, Primitive as PrimitiveDef, Property as PropertyDef, PropertyType, Scene as SceneDef } from '@gltf-transform/core';
import { AccessorSyncPair, MeshSyncPair, NodeSyncPair, PrimitiveSyncPair, RenderPair, SceneSyncPair } from './RenderPair';

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

	private _pairs = new Set<RenderPair<PropertyDef, any>>();
	private _sourceMap = new WeakMap<PropertyDef, RenderPair<PropertyDef, any>>();
	// private _targetMap = new WeakMap<any, SyncPair<PropertyDef, any>>();

	public add(pair: RenderPair<PropertyDef, any>): void {
		this._pairs.add(pair);
		this._sourceMap.set(pair.source, pair);
		// this._targetMap.set(pair._target as object, pair);
	}

	public pair(source: null): null;
	public pair(source: AccessorDef): AccessorSyncPair;
	public pair(source: MeshDef): MeshSyncPair;
	public pair(source: NodeDef): NodeSyncPair;
	public pair(source: PrimitiveDef): PrimitiveSyncPair;
	public pair(source: SceneDef): SceneSyncPair;
	public pair(source: PropertyDef): RenderPair<PropertyDef, any>;
	public pair(source: PropertyDef | null): RenderPair<PropertyDef, any> | null {
		if (!source) return null;
		if (this._sourceMap.has(source)) return this._sourceMap.get(source)!;

		switch (source.propertyType) {
			case PropertyType.ACCESSOR:
				return new AccessorSyncPair(this, source as AccessorDef).update();
			case PropertyType.MESH:
				return new MeshSyncPair(this, source as MeshDef).update();
			case PropertyType.NODE:
				return new NodeSyncPair(this, source as NodeDef).update();
			case PropertyType.PRIMITIVE:
				return new PrimitiveSyncPair(this, source as PrimitiveDef).update();
			case PropertyType.SCENE:
				return new SceneSyncPair(this, source as SceneDef).update();
			default:
				throw new Error(`Unimplemented type: ${source.propertyType}`);
		}
	}

	public dispose(): void {
		for (const pair of this._pairs) {
			pair.dispose();
		}
	}
}
