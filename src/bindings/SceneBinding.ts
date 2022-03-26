import { Group, Object3D } from 'three';
import { Node as NodeDef, Scene as SceneDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { RefListObserver } from '../observers';
import { Binding } from './Binding';
import { pool } from '../ObjectPool';

export class SceneBinding extends Binding<SceneDef, Group> {
	protected children = new RefListObserver<NodeDef, Object3D>('children', this._context);

	public constructor(context: UpdateContext, source: SceneDef) {
		super(context, source, pool.request(new Group()));
		this.children.subscribe((children) => {
			console.log('SceneBinding::children::subscribe');
			// TODO(bug): 'child.remove' is not found.
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

	public disposeTarget(target: Group): void {
		pool.release(target);
	}

	public dispose() {
		this.children.dispose();
		super.dispose();
	}
}
