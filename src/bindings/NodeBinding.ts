import { Group, Object3D } from 'three';
import { Mesh as MeshDef, Node as NodeDef, vec3, vec4 } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { eq } from '../utils';
import { Binding } from './Binding';
import { RefListObserver, RefObserver } from '../observers';
import { Object3DPool } from '../pools';

const _vec3: vec3 = [0, 0, 0];
const _vec4: vec4 = [0, 0, 0, 0];

export class NodeBinding extends Binding<NodeDef, Object3D> {
	protected children = new RefListObserver<NodeDef, Object3D>('children', this._context);
	protected mesh = new RefObserver<MeshDef, Group>('mesh', this._context)
		.setParamsFn(() => Object3DPool.createParams(this.def));

	constructor(context: UpdateContext, def: NodeDef) {
		super(context, def, context.nodePool.requestBase(new Object3D()), context.nodePool);

		this.children.subscribe((nextChildren, prevChildren) => {
			this.value.remove(...prevChildren!);
			this.value.add(...nextChildren!);
			this.publishAll();
		});
		this.mesh.subscribe((nextMesh, prevMesh) => {
			if (prevMesh) this.value.remove(prevMesh);
			if (nextMesh) this.value.add(nextMesh);
			this.publishAll();
		});
	}

	public update(): this {
		const def = this.def;
		const value = this.value;

		if (def.getName() !== value.name) {
			value.name = def.getName();
		}

		if (!eq(def.getTranslation(), value.position.toArray(_vec3))) {
			value.position.fromArray(def.getTranslation());
		}

		if (!eq(def.getRotation(), value.quaternion.toArray(_vec4))) {
			value.quaternion.fromArray(def.getRotation());
		}

		if (!eq(def.getScale(), value.scale.toArray(_vec3))) {
			value.scale.fromArray(def.getScale());
		}

		this.children.updateRefList(def.listChildren());
		this.mesh.updateRef(def.getMesh());

		return this.publishAll(); // TODO(perf)
	}

	public dispose() {
		this.children.dispose();
		this.mesh.dispose();
		super.dispose();
	}
}
