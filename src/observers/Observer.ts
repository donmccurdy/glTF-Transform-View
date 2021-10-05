import type { Binding } from '../bindings';
import type { Property as PropertyDef } from '@gltf-transform/core';
import { Subscription, THREEObject } from '../utils';
import type { VariantCache } from '../variants';

interface ObserverMap {
	cache: VariantCache<THREEObject, THREEObject, object>;
	paramsFn: () => object
}

export class Observer<T> {
	public value: T;
	protected _map: ObserverMap | null = null;
	private _listeners: ((next: T, prev: T | null) => void)[] = [];

	constructor(value: T) {
		this.value = value;
	}

	public subscribe(listener: (next: T, prev: T | null) => void): Subscription {
		const index = this._listeners.length;
		this._listeners.push(listener);
		listener(this.value, null);
		return () => { this._listeners.splice(index, 1); };
	}

	protected next(value: T) {
		for (const listener of this._listeners) {
			listener(value, this.value);
		}
		this.value = value;
	}

	public notify() {
		this.next(this.value);
	}

	public dispose() {
		this._listeners.length = 0;
	}

	public map<_S extends PropertyDef, _T extends THREEObject>(
			binding: Binding<_S, _T>, // TODO(cleanup): Remove?
			cache: VariantCache<THREEObject, THREEObject, object>,
			paramsFn: () => object
		): this {
		this._map = {cache, paramsFn};
		return this;
	}
}
