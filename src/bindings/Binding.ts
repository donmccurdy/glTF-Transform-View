import { Property as PropertyDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { Subject, Subscription } from '../utils';

export abstract class Binding <Source extends PropertyDef, Target> extends Subject<Target> {
	public source: Source;

	protected _context: UpdateContext;
	protected _lastUpdateID: number = -1;
	protected _subscriptions: Subscription[] = [];

	protected constructor(context: UpdateContext, source: Source, target: Target) {
		super(target);
		this._context = context;
		this.source = source;

		const onChange = () => {
			const prevValue = this.value;
			this.update();
			if (this.value === prevValue) {
				this.dispatchEvent('change', {});
			}
		}
		const onDispose = () => this.dispose();

		source.addEventListener('change', onChange);
		source.addEventListener('dispose', onDispose);

		this._subscriptions.push(
			this.subscribe((next, prev) => {
				if (prev && prev !== next) this.disposeTarget(prev);
			}),
			() => source.removeEventListener('change', onChange),
			() => source.removeEventListener('dispose', onDispose),
		);
	}

	public abstract update(): this;

	public dispose(): void {
		for (const unsub of this._subscriptions) unsub();
		if (this.value) this.disposeTarget(this.value);
		super.dispose();
	}

	public abstract disposeTarget(target: Target): void;
}
