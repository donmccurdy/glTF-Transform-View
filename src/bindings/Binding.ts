import { Property as PropertyDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { Subject, Subscription } from '../utils';

export abstract class Binding <Source extends PropertyDef, Target> extends Subject<Target> {
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

		source.addEventListener('change', () => this.update());
	}

	public abstract update(): this;

	public dispose(): void {
		this._targetUnsubscribe();
		if (this.value) this.disposeTarget(this.value);
		super.dispose();
	}

	public abstract disposeTarget(target: Target): void;
}
