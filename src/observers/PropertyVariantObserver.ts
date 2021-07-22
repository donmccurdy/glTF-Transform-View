import type { UpdateContext } from 'UpdateContext';
import type { Property as PropertyDef } from '@gltf-transform/core';
import { PropertyObserver } from './PropertyObserver';

// TODO(bug): When disposed, what happens to variants?
// TODO(bug): Add caching strategy.
export class PropertyVariantObserver<S extends PropertyDef, T, P> extends PropertyObserver<S, T> {
	private _configure: (target: T, params: P) => T;
	private _params: P | null = null;

	constructor(_context: UpdateContext, _configure:(target: T, params: P) => T) {
		super(_context);
		this._configure = _configure;
	}

	public setParams(params: P) {
		this._params = params;
	}

	public next(value: T) {
		if (!value) {
			super.next(null);
			return;
		}
		if (!this._params) {
			throw new Error('No variant configuration given.');
		}
		const variant = this._configure(value, this._params);
		super.next(variant);
	}
}
