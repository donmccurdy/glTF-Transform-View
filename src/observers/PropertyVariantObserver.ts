import type { UpdateContext } from '../UpdateContext';
import type { Property as PropertyDef } from '@gltf-transform/core';
import { PropertyObserver } from './PropertyObserver';
import { THREEObject, VariantCache } from '../variants/VariantCache';

export class PropertyVariantObserver<S extends PropertyDef, T extends THREEObject, P> extends PropertyObserver<S, T> {
	private _cache: VariantCache<T, T, P>;
	private _params: P | null = null;

	constructor(_context: UpdateContext, _cache: VariantCache<T, T, P>) {
		super(_context);
		this._cache = _cache;
	}

	public setParams(params: P) {
		this._params = params;
	}

	public next(value: T) {
		if (this.value) {
			this._cache.releaseVariant(this.value);
		}
		if (!value) {
			super.next(null);
			return;
		}
		if (!this._params) {
			throw new Error('No variant configuration given.');
		}
		super.next(this._cache.requestVariant(value, this._params));
	}

	public dispose() {
		if (this.value) {
			this._cache.releaseVariant(this.value);
		}
		super.dispose();
	}
}
