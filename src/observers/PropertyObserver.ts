import type { UpdateContext } from 'UpdateContext';
import type { Property as PropertyDef } from '@gltf-transform/core';
import { Observer, Subscription } from './Observer';

export class PropertyObserver<S extends PropertyDef, T> extends Observer<T | null> {
	private _source: S | null = null;
	private _unsubscribe: Subscription | null = null;

	constructor(private _context: UpdateContext) {
		super(null);
	}

	public update(source: S | null): void {
		if (this._source === source) return;

		this.unsubscribe();

		this._source = source;

		if (!source) {
			this.next(null);
			return;
		}

		const renderer = this._context.bind(source);
		this._unsubscribe = renderer.subscribe((target: T | null) => {
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
