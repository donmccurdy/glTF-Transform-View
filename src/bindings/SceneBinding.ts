import { Group, Object3D } from 'three';
import type { Node as NodeDef, Scene as SceneDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { Binding } from './Binding';
import { RefListObserver } from '../observers';

export class SceneBinding extends Binding<SceneDef, Group> {
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

		this.children.updateDefList(def.listChildren());
	}

	dispose() {
		this.children.dispose();
		super.dispose();
	}
}
