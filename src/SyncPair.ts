import type { SyncContext } from 'SyncContext';
import { BufferAttribute, BufferGeometry, Group, Mesh, MeshStandardMaterial, Object3D } from 'three';
import { eq, semanticToAttributeName } from 'utils';
import { Accessor as AccessorDef, Mesh as MeshDef, Node as NodeDef, Primitive as PrimitiveDef, Property as PropertyDef, Scene as SceneDef, vec3, vec4 } from '@gltf-transform/core';

const DEFAULT_MATERIAL = new MeshStandardMaterial({color: 0x808080, roughness: 1.0, metalness: 0.0});

export abstract class SyncPair <Source extends PropertyDef, Target> {
	protected constructor (public context: SyncContext, public source: Source, public target: Target) {
		context.add(source, this);
	}
	public abstract sync(): this;
}

export class AccessorSyncPair extends SyncPair<AccessorDef, BufferAttribute> {
	public static init(context: SyncContext, source: AccessorDef): AccessorSyncPair {
		const target = new BufferAttribute(
			source.getArray()!,
			source.getElementSize(),
			source.getNormalized()
		);

		return new AccessorSyncPair(context, source, target);
	}
	public sync(): this {
		const source = this.source;
		const target = this.target;

		let needsUpdate = false;

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
		const target = new Group();
		target.name = source.getName();

		for (const nodeDef of source.listChildren()) {
			target.add(NodeSyncPair.init(context, nodeDef).target);
		}

		// TODO(cleanup): Reduce init()/sync() redundancy.
		return new SceneSyncPair(context, source, target);
	}

	public sync(): this {
		const source = this.source;
		const target = this.target;

		if (source.getName() !== target.name) {
			target.name = source.getName();
		}

		// TODO(bug): Do not modify .children directly.
		const sourceChildren = source.listChildren();
		target.children.length = sourceChildren.length;
		for (let i = 0; i < sourceChildren.length; i++) {
			const targetChild = this.context.pair(sourceChildren[i]);
			targetChild.sync();
			target.children[i] = targetChild.target;
		}

		return this;
	}
}

export class NodeSyncPair extends SyncPair<NodeDef, Object3D> {
	public static init(context: SyncContext, source: NodeDef): NodeSyncPair {
		const target = new Object3D();
		target.name = source.getName();
		target.position.fromArray(source.getTranslation());
		target.quaternion.fromArray(source.getRotation());
		target.scale.fromArray(source.getScale());

		for (const nodeDef of source.listChildren()) {
			target.add(context.pair(nodeDef).target);
		}

		const meshDef = source.getMesh();
		if (meshDef) {
			target.add(context.pair(meshDef).target);
		}

		return new NodeSyncPair(context, source, target);
	}

	public sync(): this {
		const source = this.source;
		const target = this.target;

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

		// TODO(bug): Do not modify .children directly.
		const sourceChildren = source.listChildren();
		target.children.length = sourceChildren.length;
		for (let i = 0; i < sourceChildren.length; i++) {
			const childPair = this.context.pair(sourceChildren[i]);
			childPair.sync();
			target.children[i] = childPair.target;
		}

		// TODO(bug): Do not modify .children directly.
		const meshDef = source.getMesh();
		if (meshDef) {
			const meshPair = this.context.pair(meshDef);
			meshPair.sync();
			target.children.push(meshPair.target);
		}

		return this;
	}
}

export class MeshSyncPair extends SyncPair<MeshDef, Group> {
	public static init(context: SyncContext, source: MeshDef): MeshSyncPair {
		const target = new Group();
		target.name = source.getName();

		for (const primDef of source.listPrimitives()) {
			target.add(context.pair(primDef).target);
		}

		return new MeshSyncPair(context, source, target);
	}
	public sync(): this {
		const source = this.source;
		const target = this.target;

		if (source.getName() !== target.name) {
			target.name = source.getName();
		}

		// TODO(bug): Do not modify .children directly.
		const sourcePrims = source.listPrimitives();
		target.children.length = sourcePrims.length;
		for (let i = 0; i < sourcePrims.length; i++) {
			const primPair = this.context.pair(sourcePrims[i]);
			primPair.sync();
			target.children[i] = primPair.target;
		}

		return this;
	}
}

export class PrimitiveSyncPair extends SyncPair<PrimitiveDef, Mesh> {
	public static init(context: SyncContext, source: PrimitiveDef): PrimitiveSyncPair {
		const geometry = new BufferGeometry();
		geometry.name = source.getName();

		const indicesDef = source.getIndices();
		if (indicesDef) {
			geometry.setIndex(context.pair(indicesDef).target);
		}

		for (const semantic of source.listSemantics()) {
			const attributeDef = source.getAttribute(semantic)!;
			geometry.setAttribute(semanticToAttributeName(semantic), context.pair(attributeDef).target);
		}

		const target = new Mesh(geometry, DEFAULT_MATERIAL);

		return new PrimitiveSyncPair(context, source, target);
	}

	public sync(): this {
		const source = this.source;
		const target = this.target;
		const context = this.context;

		// const indicesDef = source.getIndices();
		// const indicesPair = context.pair(indicesDef);
		// if (indicesPair && !target)
		console.warn('primitive sync() not implemented.');

		return this;
	}
}