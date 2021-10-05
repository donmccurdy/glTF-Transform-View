import type { UpdateContext } from '../UpdateContext';
import type { Property as PropertyDef } from '@gltf-transform/core';
import { Observer } from './Observer';
import { THREEObject, Subscription } from '../utils';

export class PropertyObserver<S extends PropertyDef, T extends THREEObject> extends Observer<T | null> {
	protected _source: S | null = null;
	protected _valueBase: T | null = null;
	protected _unsubscribe: Subscription | null = null;

	constructor(public readonly name: string, protected _context: UpdateContext) {
		super(null);
	}

	public update(source: S | null): void {
		const context = this._context;
		const binding = source ? context.bind(source) : null;

		if (binding && context.deep) binding.updateOnce();

		if (this._source === source) {
			if (this._map && this._valueBase && this.value) {
				this._map.cache.updateVariant(this._valueBase, this.value, this._map.paramsFn());
			}
			return;
		}

		this.unsubscribe();

		this._source = source;

		if (!source || !binding) {
			this._disposeTarget();
			this.next(null);
			return;
		}

		this._unsubscribe = binding.subscribe((target: T | null) => {
			this._disposeTarget();

			this._valueBase = target;
			const valueDst = this._map && target
				? this._map.cache.requestVariant(target, this._map.paramsFn()) as T
				: target;

			this.next(valueDst);
		});
	}

	private _disposeTarget() {
		if (this._map && this.value) {
			this._map.cache.releaseVariant(this.value);
		}
		this._valueBase = null;
	}

	public dispose() {
		if (this._unsubscribe) this._unsubscribe();
		this._disposeTarget();
		super.dispose();
	}

	protected unsubscribe() {
		if (this._unsubscribe) {
			this._unsubscribe();
			this._unsubscribe = null;
		}
	}
}
