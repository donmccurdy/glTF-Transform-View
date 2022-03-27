import { Group, Object3D } from 'three';
import { Node as NodeDef, Scene as SceneDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { Binding } from './Binding';
import { pool } from '../ObjectPool';
import { NodeBinding } from './NodeBinding';
import { ListObserver } from '../observers';

export class SceneBinding extends Binding<SceneDef, Group> {
	protected children = new ListObserver<NodeDef, NodeBinding, Object3D>('children', this._context);

	public constructor(context: UpdateContext, source: SceneDef) {
		super(context, source, pool.request(new Group()));
		this.children.subscribe((nextChildren, prevChildren) => {
			this.value.remove(...prevChildren!);
			this.value.add(...nextChildren);
			this.publishAll();
		});
	}

	public update(): this {
		const source = this.def;
		const target = this.value;

		if (source.getName() !== target.name) {
			target.name = source.getName();
		}

		this.children.updateSourceList(source.listChildren());

		return this.publishAll(); // TODO(perf)
	}

	public disposeValue(target: Group): void {
		pool.release(target);
	}

	public dispose() {
		this.children.dispose();
		super.dispose();
	}
}
