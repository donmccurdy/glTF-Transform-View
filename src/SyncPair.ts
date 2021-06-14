import type { SyncContext } from 'SyncContext';
import { BufferAttribute, BufferGeometry, Group, Mesh, MeshStandardMaterial, Object3D } from 'three';
import { eq, semanticToAttributeName } from 'utils';
import { Accessor as AccessorDef, Mesh as MeshDef, Node as NodeDef, Primitive as PrimitiveDef, Property as PropertyDef, Scene as SceneDef, vec3, vec4 } from '@gltf-transform/core';

const DEFAULT_MATERIAL = new MeshStandardMaterial({color: 0x808080, roughness: 1.0, metalness: 0.0});

// TODO(bug): Need to model pair.target as a observable (or similar), such that
// its value can change over time. Examples:
//   - {Mesh, SkinnedMesh, Points, Lines, ...}
//   - {BufferAttribute...}
//   - {MeshStandardMaterial, MeshBasicMaterial, MeshPhysicalMaterial, ...}
//
// TODO(bug): Mapping may not be 1:1. Examples:
//   - Materials (temporary)
//   - Textures (temporary)
export abstract class SyncPair <Source extends PropertyDef, Target> {
	protected constructor (public context: SyncContext, public source: Source, public target: Target) {
		context.add(this);
	}
	public abstract sync(deep: boolean): this;
	public dispose(): void {}
}

export class AccessorSyncPair extends SyncPair<AccessorDef, BufferAttribute> {
	public static init(context: SyncContext, source: AccessorDef): AccessorSyncPair {
		const target = new BufferAttribute(
			source.getArray()!,
			source.getElementSize(),
			source.getNormalized()
		);
		return new AccessorSyncPair(context, source, target).sync(false);
	}

	public sync(deep: boolean): this {
		const source = this.source;
		const target = this.target;

		let needsUpdate = false;

		// TODO(bug): THREE.BufferAttribute is not resizable.
		if (source.getArray() !== target.array) {
			target.array = source.getArray()!;
			needsUpdate = true;
		}

		if (source.getElementSize() !== target.itemSize) {
			target.itemSize = source.getElementSize();
			needsUpdate = true;
		}

		if (source.getNormalized() !== target.normalized) {
			target.normalized = source.getNormalized();
			needsUpdate = true;
		}

		if (needsUpdate) {
			target.needsUpdate = true;
		}

		return this;
	}
}

const _vec3: vec3 = [0, 0, 0];
const _vec4: vec4 = [0, 0, 0, 0];

export class SceneSyncPair extends SyncPair<SceneDef, Group> {
	public static init(context: SyncContext, source: SceneDef): SceneSyncPair {
		return new SceneSyncPair(context, source, new Group()).sync(false);
	}

	public sync(deep: boolean): this {
		const source = this.source;
		const target = this.target;
		const context = this.context;

		if (source.getName() !== target.name) {
			target.name = source.getName();
		}

		target.clear();

		// Update children.
		for (const childDef of source.listChildren()) {
			const childPair = context.pair(childDef);
			target.add(childPair.target);
			if (deep) childPair.sync(true);
		}

		return this;
	}
}

export class NodeSyncPair extends SyncPair<NodeDef, Object3D> {
	public static init(context: SyncContext, source: NodeDef): NodeSyncPair {
		return new NodeSyncPair(context, source, new Object3D()).sync(false);
	}

	public sync(deep: boolean): this {
		const source = this.source;
		const target = this.target;
		const context = this.context;

		if (source.getName() !== target.name) {
			target.name = source.getName();
		}

		if (!eq(source.getTranslation(), target.position.toArray(_vec3))) {
			target.position.fromArray(source.getTranslation());
		}

		if (!eq(source.getRotation(), target.quaternion.toArray(_vec4))) {
			target.quaternion.fromArray(source.getRotation());
		}

		if (!eq(source.getScale(), target.scale.toArray(_vec3))) {
			target.scale.fromArray(source.getScale());
		}

		target.clear();

		// Update children.
		for (const childDef of source.listChildren()) {
			const childPair = context.pair(childDef);
			target.add(childPair.target);
			if (deep) childPair.sync(true);
		}

		// Update mesh.
		const meshDef = source.getMesh();
		if (meshDef) {
			const meshPair = context.pair(meshDef);
			target.add(meshPair.target);
			if (deep) meshPair.sync(true);
		}

		return this;
	}
}

export class MeshSyncPair extends SyncPair<MeshDef, Group> {
	public static init(context: SyncContext, source: MeshDef): MeshSyncPair {
		return new MeshSyncPair(context, source, new Group()).sync(false);
	}
	public sync(deep: boolean): this {
		const source = this.source;
		const target = this.target;

		if (source.getName() !== target.name) {
			target.name = source.getName();
		}

		target.clear();

		// Update primitives.
		for (const primDef of source.listPrimitives()) {
			const primPair = this.context.pair(primDef);
			target.add(primPair.target);
			if (deep) primPair.sync(true);
		}

		return this;
	}
}

export class PrimitiveSyncPair extends SyncPair<PrimitiveDef, Mesh> {
	public static init(context: SyncContext, source: PrimitiveDef): PrimitiveSyncPair {
		const target = new Mesh(new BufferGeometry(), DEFAULT_MATERIAL);
		return new PrimitiveSyncPair(context, source, target).sync(false);
	}

	public sync(deep: boolean): this {
		const source = this.source;
		const target = this.target;
		const context = this.context;
		const geometry = target.geometry;

		if (source.getName() !== target.name) {
			target.name = source.getName();
		}

		// Update indices.
		const indicesDef = source.getIndices();
		if (indicesDef) {
			const indicesPair = context.pair(indicesDef);
			geometry.setIndex(indicesPair.target);
			if (deep) indicesPair.sync(true);
		} else if (geometry.index) {
			geometry.setIndex(null);
		}

		// Remove inactive attributes.
		const prevAttributes = Object.keys(geometry.attributes);
		const nextAttributes = new Set(source.listSemantics().map(semanticToAttributeName));
		for (const attribute of prevAttributes) {
			if (!nextAttributes.has(attribute)) {
				geometry.deleteAttribute(attribute);
			}
		}

		// Update current attributes.
		for (const semantic of source.listSemantics()) {
			const attributeDef = source.getAttribute(semantic)!;
			const attributePair = context.pair(attributeDef);
			geometry.setAttribute(semanticToAttributeName(semantic), attributePair.target);
			if (deep) attributePair.sync(true);
		}

		return this;
	}

	public dispose(): void {
		this.target.geometry.dispose();
	}
}