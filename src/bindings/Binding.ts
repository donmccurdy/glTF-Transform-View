import { Property as PropertyDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { Observer, Subscription } from '../observers';
import { pool } from 'ObjectPool';

export abstract class Binding <Source extends PropertyDef, Target> extends Observer<Target> {
	public source: Source;

	protected _context: UpdateContext;
	protected _lastUpdateID: number = -1;
	protected _targetUnsubscribe: Subscription;

	protected constructor(context: UpdateContext, source: Source, target: Target) {
		super(target);
		this._context = context;
		this.source = source;

		this._targetUnsubscribe = this.subscribe((next, prev) => {
			if (prev && prev !== next) this.disposeTarget(prev);
		});
	}

	public abstract update(): this;

	public updateOnce(): this {
		if (this._context.deep && this._lastUpdateID < this._context.updateID) {
			this._lastUpdateID = this._context.updateID;
			this.update();
		}
		return this;
	}

	public dispose(): void {
		this._targetUnsubscribe();
		if (this.value) this.disposeTarget(this.value);
		super.dispose();
	}

	public abstract disposeTarget(target: Target): void;
}
