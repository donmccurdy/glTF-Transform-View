import type { Property as PropertyDef } from '@gltf-transform/core';
import { Subject, THREEObject } from '../utils';
import type { ObserverMap } from '../maps';

interface ObserverMapImpl {
	cache: ObserverMap<THREEObject, THREEObject, object>;
	paramsFn: () => object
}

export class Observer<T> extends Subject<T> {
	protected _map: ObserverMapImpl | null = null;
	public map<_S extends PropertyDef, _T extends THREEObject>(
			cache: ObserverMap<THREEObject, THREEObject, object>,
			paramsFn: () => object
		): this {
		this._map = {cache, paramsFn};
		return this;
	}
}
