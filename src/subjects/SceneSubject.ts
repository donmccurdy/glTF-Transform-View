import { Group, Object3D } from 'three';
import type { Node as NodeDef, Scene as SceneDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { Subject } from './Subject';
import { RefListObserver } from '../observers';

export class SceneSubject extends Subject<SceneDef, Group> {
	protected children = new RefListObserver<NodeDef, Object3D>('children', this._context);

	constructor(context: UpdateContext, def: SceneDef) {
		super(context, def, context.scenePool.requestBase(new Group()), context.scenePool);
		this.children.subscribe((nextChildren, prevChildren) => {
			if (prevChildren.length) this.value.remove(...prevChildren);
			if (nextChildren.length) this.value.add(...nextChildren);
			this.publishAll();
		});
	}

	update() {
		const def = this.def;
		const target = this.value;

		if (def.getName() !== target.name) {
			target.name = def.getName();
		}

		this.children.update(def.listChildren());
	}

	dispose() {
		this.children.dispose();
		super.dispose();
	}
}
