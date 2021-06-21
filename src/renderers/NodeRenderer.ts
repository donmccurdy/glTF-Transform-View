import { Group, Object3D } from 'three';
import { Mesh as MeshDef, Node as NodeDef, vec3, vec4 } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { PropertyListObserver, PropertyObserver } from '../observers';
import { eq } from '../utils';
import { Renderer } from './Renderer';

const _vec3: vec3 = [0, 0, 0];
const _vec4: vec4 = [0, 0, 0, 0];

export class NodeRenderer extends Renderer<NodeDef, Object3D> {
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
