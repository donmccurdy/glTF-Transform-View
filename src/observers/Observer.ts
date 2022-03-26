import type { Property as PropertyDef } from '@gltf-transform/core';
import { Event, EventDispatcher, Subject, Subscription, THREEObject } from '../utils';
import type { ObserverMap } from '../maps';
import { UpdateContext } from '../UpdateContext';
import type { Binding } from '../bindings';

interface ObserverMapImpl {
	cache: ObserverMap<THREEObject, THREEObject, object>;
	paramsFn: () => object,
	unsub: () => void,
}

// TODO(bug): Only RefObserver actually implements the map() function...
export class Observer<S extends PropertyDef, T extends THREEObject, E> extends Subject<E> {
	public readonly name;
	protected readonly _context: UpdateContext;
	protected readonly _queue: E[] = [];
	protected readonly _sourceSubscriptions = new Map<S, Subscription[]>();
	protected _map: ObserverMapImpl | null = null;

	constructor(name: string, context: UpdateContext, value: E) {
		super(value);
		this.name = name;
		this._context = context;
	}

	protected queue(value: E) {
		this._queue.push(value);
	}

	protected flush() {
		for (const value of this._queue) {
			this.next(value);
		}
	}

	// public map<_S extends PropertyDef, _T extends THREEObject>(
	// 		cache: ObserverMap<THREEObject, THREEObject, object>,
	// 		paramsFn: () => object,
	// 		paramsSrc: Binding<PropertyDef, unknown>,
	// 	): this {
	// 	if (this._map) throw new Error('Cannot change ObserverMap.');
	// 	const unsub = paramsSrc.on('change', () => {
	// 		// TODO(impl): ???
	// 	});
	// 	this._map = {cache, paramsFn, unsub};
	// 	return this;
	// }

	// protected _mapRequest(base: T | null): T | null {
	// 	// TODO(bug): need to be very careful about requesting
	// 	// and releasing variants consistently.
	// 	if (this._map && base) {
	// 		return this._map.cache.requestVariant(base, this._map.paramsFn()) as T;
	// 	}
	// 	return base;
	// }

	// protected _mapRelease(base: T | null) {
	// 	if (this._map && base) {
	// 		this._map.cache.releaseVariant(base);
	// 	}
	// }

	// // TODO(cleanup): Meaning of 'update' inconsistent here vs
	// // in observer.update(...)...
	// //  ... if _params_ change, parent binding should initiate
	// //  ... if _base_ changes, ...?
	// protected _mapUpdate(base: T) {
	// 	if (!this._map) return;
	// 	const params = this._map.paramsFn();
	// 	// TODO(bug): Way too much here...
	// 	// for (const variant of this._map.cache.listVariants(base)) {
	// 	// 	this._map.cache.updateVariant(base, variant, params);
	// 	// }
	// }

	protected _addSource(source: S) {
		// Note: Replacement delegated to subclasses.

		const binding = this._context.bind(source) as Binding<S, T>;
		this._sourceSubscriptions.set(source, [
			binding.on('change', () => {
				this._updateSource(source);
				this.flush();
			}),
			binding.on('dispose', () => {
				this._removeSource(source);
				this.flush();
			})
		]);
	}

	protected _updateSource(source: S) {
		// const binding = this._context.bind(source) as Binding<S, T>;
		// this._mapUpdate(binding.value);
	}

	protected _removeSource(source: S) {
		const unsubs = this._sourceSubscriptions.get(source) || [];
		for (const unsub of unsubs) unsub();
		this._sourceSubscriptions.delete(source);

		// const binding = this._context.bind(source);
		// const base = this._sourceToBase.get(source);
		// if (base) {
		// 	// ???
		// }
		// this._sourceToBase.delete(source);

		// TODO(impl): Invoke .next(...)?
	}

	public dispose() {
		for (const [_, unsubs] of this._sourceSubscriptions) {
			for (const unsub of unsubs) unsub();
		}
		this._sourceSubscriptions.clear();
		// if (this._map) this._map.unsub();
		super.dispose();
	}
}
