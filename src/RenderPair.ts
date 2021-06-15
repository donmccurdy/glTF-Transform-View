import { PropertyListObserver } from 'PropertyListObserver';
import { PropertyMapObserver } from 'PropertyMapObserver';
import { PropertyObserver } from 'PropertyObserver';
import { BufferAttribute, BufferGeometry, Group, Mesh, MeshStandardMaterial, Object3D } from 'three';
import { Accessor as AccessorDef, Mesh as MeshDef, Node as NodeDef, Primitive as PrimitiveDef, Property as PropertyDef, Scene as SceneDef, vec3, vec4 } from '@gltf-transform/core';
import { Observer, Subscription } from './Observer';
import type { UpdateContext } from './SyncContext';
import { eq, semanticToAttributeName } from './utils';

const DEFAULT_MATERIAL = new MeshStandardMaterial({color: 0x808080, roughness: 1.0, metalness: 0.0});

// TODO(bug): Mapping may not be 1:1. Model as derived Observable? Examples:
//   - Materials (temporary)
//   - Textures (temporary)
export abstract class RenderPair <Source extends PropertyDef, Target> extends Observer<Target> {
	public source: Source;

	protected _context: UpdateContext;
	protected _targetUnsubscribe: Subscription;

	protected constructor (context: UpdateContext, source: Source, target: Target) {
		super(target);
		this._context = context;
		this.source = source;

		this._targetUnsubscribe = this.subscribe((next, prev) => {
			if (prev && prev !== next) this.disposeTarget(prev);
		});

		this._context.add(this);
	}

	public abstract update(): this;

	public dispose(): void {
		this._targetUnsubscribe();
		if (this.value) this.disposeTarget(this.value);
		super.dispose();
	}

	public disposeTarget(target: Target) {}
}

export class AccessorSyncPair extends RenderPair<AccessorDef, BufferAttribute> {
	public constructor(context: UpdateContext, source: AccessorDef) {
		super(context, source, AccessorSyncPair.createTarget(source));
	}

	private static createTarget(source: AccessorDef): BufferAttribute {
		return new BufferAttribute(
			source.getArray()!,
			source.getElementSize(),
			source.getNormalized()
		);
	}

	public update(): this {
		const source = this.source;
		const target = this.value;

		if (source.getArray() !== target.array
			|| source.getElementSize() !== target.itemSize
			|| source.getNormalized() !== target.normalized) {
			this.next(AccessorSyncPair.createTarget(source));
		} else {
			// TODO(feat): Conditional?
			target.needsUpdate = true;
		}

		return this;
	}
}

const _vec3: vec3 = [0, 0, 0];
const _vec4: vec4 = [0, 0, 0, 0];

export class SceneSyncPair extends RenderPair<SceneDef, Group> {
	protected children = new PropertyListObserver<NodeDef, Object3D>(this._context);

	public constructor(context: UpdateContext, source: SceneDef) {
		super(context, source, new Group());
		this.children.subscribe((children) => {
			if (children.remove) this.value.remove(children.remove);
			if (children.add) this.value.add(children.add);
		});
	}

	public update(): this {
		const source = this.source;
		const target = this.value;

		if (source.getName() !== target.name) {
			target.name = source.getName();
		}

		this.children.update(source.listChildren());

		return this;
	}

	public dispose() {
		this.children.dispose();
		super.dispose();
	}
}

export class NodeSyncPair extends RenderPair<NodeDef, Object3D> {
	protected children = new PropertyListObserver<NodeDef, Object3D>(this._context);
	protected mesh = new PropertyObserver<MeshDef, Group>(this._context);

	constructor(context: UpdateContext, source: NodeDef) {
		super(context, source, new Object3D());

		this.children.subscribe((children) => {
			if (children.remove) this.value.remove(children.remove);
			if (children.add) this.value.add(children.add);
		});
		this.mesh.subscribe((add, remove) => {
			if (remove) this.value.remove(remove);
			if (add) this.value.add(add);
		});
	}

	public update(): this {
		const source = this.source;
		const target = this.value;

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

		this.children.update(source.listChildren());
		this.mesh.update(source.getMesh());

		return this;
	}

	public dispose() {
		this.children.dispose();
		this.mesh.dispose();
		super.dispose();
	}
}

export class MeshSyncPair extends RenderPair<MeshDef, Group> {
	protected primitives = new PropertyListObserver<PrimitiveDef, Mesh>(this._context);

	public constructor(context: UpdateContext, source: MeshDef) {
		super(context, source, new Group());

		this.primitives.subscribe((primitives) => {
			if (primitives.remove) this.value.remove(primitives.remove);
			if (primitives.add) this.value.add(primitives.add);
		});
	}
	public update(): this {
		const source = this.source;
		const target = this.value;

		if (source.getName() !== target.name) {
			target.name = source.getName();
		}

		this.primitives.update(source.listPrimitives());

		return this;
	}

	public dispose() {
		this.primitives.dispose();
		super.dispose();
	}
}

export class PrimitiveSyncPair extends RenderPair<PrimitiveDef, Mesh> {
	protected indices = new PropertyObserver<AccessorDef, BufferAttribute>(this._context);
	protected attributes = new PropertyMapObserver<AccessorDef, BufferAttribute>(this._context);

	public constructor(context: UpdateContext, source: PrimitiveDef) {
		super(context, source, new Mesh(new BufferGeometry(), DEFAULT_MATERIAL));

		this.indices.subscribe((indices) => this.value.geometry.setIndex(indices));
		this.attributes.subscribe(({key, value}) => {
			if (value) this.value.geometry.setAttribute(semanticToAttributeName(key), value);
			if (!value) this.value.geometry.deleteAttribute(semanticToAttributeName(key));
		});
	}

	public update(): this {
		const source = this.source;
		const target = this.value;

		if (source.getName() !== target.name) {
			target.name = source.getName();
		}

		this.indices.update(source.getIndices());
		this.attributes.update(source.listSemantics(), source.listAttributes());

		return this;
	}

	public disposeTarget(target: Mesh): void {
		target.geometry.dispose();
	}

	public dispose() {
		this.indices.dispose();
		this.attributes.dispose();
		super.dispose();
	}
}
