import { Group, Object3D } from 'three';
import { Node as NodeDef, Scene as SceneDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { PropertyListObserver } from '../observers';
import { Binding } from './Binding';
import { pool } from '../ObjectPool';

export class SceneBinding extends Binding<SceneDef, Group> {
	protected children = new PropertyListObserver<NodeDef, Object3D>('children', this._context);

	public constructor(context: UpdateContext, source: SceneDef) {
		super(context, source, pool.request(new Group()));
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

	public disposeTarget(target: Group): void {
		pool.release(target);
	}

	public dispose() {
		this.children.dispose();
		super.dispose();
	}
}
