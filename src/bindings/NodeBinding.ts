import { Group, Object3D } from 'three';
import { Mesh as MeshDef, Node as NodeDef, vec3, vec4 } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { PropertyListObserver, PropertyObserver } from '../observers';
import { eq } from '../utils';
import { Binding } from './Binding';
import { pool } from '../ObjectPool';

const _vec3: vec3 = [0, 0, 0];
const _vec4: vec4 = [0, 0, 0, 0];

export class NodeBinding extends Binding<NodeDef, Object3D> {
	protected children = new PropertyListObserver<NodeDef, Object3D>(this._context);
	protected mesh = new PropertyObserver<MeshDef, Group>(this._context);

	private _mesh: Object3D | null = null;

	constructor(context: UpdateContext, source: NodeDef) {
		super(context, source, pool.request(new Object3D()));

		this.children.subscribe((children) => {
			if (children.remove) this.value.remove(children.remove);
			if (children.add) this.value.add(children.add);
		});
		this.mesh.subscribe((add, remove) => {
			if (remove) this._setMesh(null);
			if (add) this._setMesh(add);
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

	private _setMesh(mesh: Object3D |  null) {
		const target = this.value;
		const prevMesh = this._mesh;

		if (prevMesh) {
			target.remove(pool.release(prevMesh));
		}

		if (mesh) {
			// Clone. glTF mesh can be reused, three.js mesh cannot.
			target.add((this._mesh = pool.request(mesh.clone())));
		} else {
			this._mesh = null;
		}
	}

	public disposeTarget(target: Object3D): void {
		pool.release(target);
	}

	public dispose() {
		this._setMesh(null);
		this.children.dispose();
		this.mesh.dispose();
		super.dispose();
	}
}
