import { Group, Object3D } from 'three';
import { Node as NodeDef, Scene as SceneDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { Binding } from './Binding';
import { RefListObserver } from '../observers';

export class SceneBinding extends Binding<SceneDef, Group> {
	protected children = new RefListObserver<NodeDef, Object3D>('children', this._context);

	public constructor(context: UpdateContext, source: SceneDef) {
		super(context, source, context.scenePool.requestBase(new Group()), context.scenePool);
		this.children.subscribe((nextChildren, prevChildren) => {
			this.value.remove(...prevChildren!);
			this.value.add(...nextChildren);
			this.publishAll();
		});
	}

	public update(): this {
		const source = this.def;
		const target = this.value;

		console.log('SceneBinding::update');

		if (source.getName() !== target.name) {
			target.name = source.getName();
		}

		this.children.updateRefList(source.listChildren());

		return this.publishAll(); // TODO(perf)
	}

	public dispose() {
		this.children.dispose();
		super.dispose();
	}
}
