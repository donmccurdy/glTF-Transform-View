import { Accessor as AccessorDef, Mesh as MeshDef, Node as NodeDef, Primitive as PrimitiveDef, Property as PropertyDef, PropertyType, Scene as SceneDef } from '@gltf-transform/core';
import { AccessorSyncPair, MeshSyncPair, NodeSyncPair, PrimitiveSyncPair, SceneSyncPair, SyncPair } from './SyncPair';

export class SyncContext {
	private _map = new WeakMap<PropertyDef, SyncPair<PropertyDef, unknown>>();

	public add(source: PropertyDef, pair: SyncPair<PropertyDef, unknown>): void {
		this._map.set(source, pair);
	}

	public pair(source: null): null;
	public pair(source: AccessorDef): AccessorSyncPair;
	public pair(source: MeshDef): MeshSyncPair;
	public pair(source: NodeDef): NodeSyncPair;
	public pair(source: PrimitiveDef): PrimitiveSyncPair;
	public pair(source: SceneDef): SceneSyncPair;
    public pair(source: PropertyDef): SyncPair<PropertyDef, unknown>;
	public pair(source: PropertyDef | null): SyncPair<PropertyDef, unknown> | null {
		if (!source) return null;
		if (this._map.has(source)) return this._map.get(source)!;

		switch (source.propertyType) {
			case PropertyType.ACCESSOR:
				return AccessorSyncPair.init(this, source as AccessorDef);
			case PropertyType.MESH:
				return MeshSyncPair.init(this, source as MeshDef);
			case PropertyType.NODE:
				return NodeSyncPair.init(this, source as NodeDef);
			case PropertyType.PRIMITIVE:
				return PrimitiveSyncPair.init(this, source as PrimitiveDef);
			case PropertyType.SCENE:
				return SceneSyncPair.init(this, source as SceneDef);
			default:
				throw new Error(`Unimplemented type: ${source.propertyType}`);
		}
	}
}
