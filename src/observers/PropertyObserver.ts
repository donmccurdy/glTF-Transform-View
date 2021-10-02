import type { UpdateContext } from 'UpdateContext';
import type { Property as PropertyDef } from '@gltf-transform/core';
import { Observer, Subscription } from './Observer';

export class PropertyObserver<S extends PropertyDef, T> extends Observer<T | null> {
	protected _source: S | null = null;
	protected _unsubscribe: Subscription | null = null;

	constructor(protected _context: UpdateContext) {
		super(null);
	}

	public update(source: S | null): void {
		const context = this._context;
		const binding = source ? context.bind(source) : null;

		if (binding && context.deep) binding.updateOnce();

		if (this._source === source) return;

		this.unsubscribe();

		this._source = source;

		if (!source || !binding) {
			this.next(null);
			return;
		}

		this._unsubscribe = binding.subscribe((target: T | null) => {
			this.next(target);
		});
	}

	public dispose() {
		if (this._unsubscribe) this._unsubscribe();
		super.dispose();
	}

	protected unsubscribe() {
		if (this._unsubscribe) {
			this._unsubscribe();
			this._unsubscribe = null;
		}
	}
}
