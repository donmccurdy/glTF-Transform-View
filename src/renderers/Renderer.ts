import { Property as PropertyDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { Observer, Subscription } from '../observers';

// TODO(bug): Mapping may not be 1:1. Model as derived Observable? Examples:
//   - Materials (temporary)
//   - Textures (temporary)
export abstract class Renderer <Source extends PropertyDef, Target> extends Observer<Target> {
	public source: Source;

	protected _context: UpdateContext;
	protected _targetUnsubscribe: Subscription;

	protected constructor (context: UpdateContext, source: Source, target: Target) {
		super(target);
		this._context = context;
		this.source = source;

		this._targetUnsubscribe = this.subscribe((next, prev) => {
			if (prev && prev !== next) this.disposeTarget(prev);
		});

		this._context.add(this);
	}

	public abstract update(): this;

	public dispose(): void {
		this._targetUnsubscribe();
		if (this.value) this.disposeTarget(this.value);
		super.dispose();
	}

	public disposeTarget(target: Target) {}
}
