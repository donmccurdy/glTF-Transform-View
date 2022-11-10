import { Bone, Group, Object3D, Skeleton, SkinnedMesh } from 'three';
import { Mesh as MeshDef, Node as NodeDef, Skin as SkinDef, vec3, vec4 } from '@gltf-transform/core';
import { Light as LightDef } from '@gltf-transform/extensions';
import type { DocumentViewSubjectAPI } from '../DocumentViewImpl';
import { eq } from '../utils';
import { Subject } from './Subject';
import { RefListObserver, RefObserver } from '../observers';
import { SingleUserPool } from '../pools';
import { LightLike } from '../constants';

const _vec3: vec3 = [0, 0, 0];
const _vec4: vec4 = [0, 0, 0, 0];

/** @internal */
export class NodeSubject extends Subject<NodeDef, Object3D> {
	protected children = new RefListObserver<NodeDef, Object3D>('children', this._documentView);
	protected mesh = new RefObserver<MeshDef, Group>('mesh', this._documentView)
		.setParamsFn(() => SingleUserPool.createParams(this.def));
	protected skin = new RefObserver<SkinDef, Skeleton>('skin', this._documentView);
	protected light = new RefObserver<LightDef, LightLike>('light', this._documentView);

	/** Output (Object3D) is never cloned by an observer. */
	protected _outputSingleton = true;

	constructor(documentView: DocumentViewSubjectAPI, def: NodeDef) {
		super(
			documentView,
			def,
			documentView.nodePool.requestBase(isJoint(def) ? new Bone() : new Object3D()),
			documentView.nodePool
		);

		this.children.subscribe((nextChildren, prevChildren) => {
			if (prevChildren.length) this.value.remove(...prevChildren);
			if (nextChildren.length) this.value.add(...nextChildren);
			this.publishAll();
		});
		this.mesh.subscribe((nextMesh, prevMesh) => {
			if (prevMesh) this.value.remove(prevMesh);
			if (nextMesh) this.value.add(nextMesh);
			this.bindSkeleton(this.skin.value);
			this.publishAll();
		});
		this.skin.subscribe((skin) => {
			this.bindSkeleton(skin);
			this.publishAll;
		});
		this.light.subscribe((nextLight, prevLight) => {
			if (prevLight) this.value.remove(prevLight);
			if (nextLight) this.value.add(nextLight);
			this.publishAll();
		});
	}

	private bindSkeleton(skeleton: Skeleton | null) {
		// TODO(test): Unclear what happens here if skin is unassigned.
		if (!this.mesh.value || !skeleton) return;

		for (const prim of this.mesh.value.children) {
			if (prim instanceof SkinnedMesh) {
				prim.bind(skeleton, prim.matrixWorld);
			}
		}
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
		this.skin.update(def.getSkin());
		this.light.update(def.getExtension('KHR_lights_punctual'));
	}

	dispose() {
		this.children.dispose();
		this.mesh.dispose();
		this.skin.dispose();
		this.light.dispose();
		super.dispose();
	}
}

function isJoint(def: NodeDef): boolean {
	return def.listParents().some((parent) => parent instanceof SkinDef);
}
