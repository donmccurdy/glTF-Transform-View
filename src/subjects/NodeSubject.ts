import { Group, Object3D } from 'three';
import { Mesh as MeshDef, Node as NodeDef, vec3, vec4 } from '@gltf-transform/core';
import type { DocumentViewImpl } from '../DocumentViewImpl';
import { eq } from '../utils';
import { Subject } from './Subject';
import { RefListObserver, RefObserver } from '../observers';
import { SingleUserPool } from '../pools';

const _vec3: vec3 = [0, 0, 0];
const _vec4: vec4 = [0, 0, 0, 0];

/** @internal */
export class NodeSubject extends Subject<NodeDef, Object3D> {
	protected children = new RefListObserver<NodeDef, Object3D>('children', this._documentView);
	protected mesh = new RefObserver<MeshDef, Group>('mesh', this._documentView)
		.setParamsFn(() => SingleUserPool.createParams(this.def));

	constructor(documentView: DocumentViewImpl, def: NodeDef) {
		super(documentView, def, documentView.nodePool.requestBase(new Object3D()), documentView.nodePool);

		this.children.subscribe((nextChildren, prevChildren) => {
			if (prevChildren.length) this.value.remove(...prevChildren);
			if (nextChildren.length) this.value.add(...nextChildren);
			this.publishAll();
		});
		this.mesh.subscribe((nextMesh, prevMesh) => {
			if (prevMesh) this.value.remove(prevMesh);
			if (nextMesh) this.value.add(nextMesh);
			this.publishAll();
		});
	}

	update() {
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

		this.children.update(def.listChildren());
		this.mesh.update(def.getMesh());
	}

	dispose() {
		this.children.dispose();
		this.mesh.dispose();
		super.dispose();
	}
}
