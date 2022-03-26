import type { Property as PropertyDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import type { Binding } from '../bindings';
import { Observer } from './Observer';
import { THREEObject, Subscription } from '../utils';

export interface ListUpdate<T> {
	remove?: T,
	add?: T,
}

export class RefListObserver<S extends PropertyDef, T extends THREEObject> extends Observer<S, T, ListUpdate<T>> {
	// TODO(bug): RefList may have ≥2 of the same source.
	private _sources = new Set<S>();

	constructor(name: string, context: UpdateContext) {
		super(name, context, {});
	}

	public update(sources: S[]): void {
		// TODO(bug): RefList may have ≥2 of the same source.
		const nextSources = new Set(sources);

		// Remove.
		for (const prevSource of this._sources) {
			if (!nextSources.has(prevSource)) {
				this._removeSource(prevSource);
			}
		}

		// Add.
		for (const nextSource of nextSources) {
			if (!this._sources.has(nextSource)) {
				this._addSource(nextSource);
			}
		}

		this.flush();
	}

	protected _addSource(source: S) {
		super._addSource(source);
		this._sources.add(source);

		const binding = this._context.bind(source) as Binding<S, T>;
		this._sourceSubscriptions.get(source)!
			.push(binding.subscribe((next, prev) => {
				const update = {} as ListUpdate<T>;
				if (prev) update.remove = prev;
				if (next) update.add = next;
				if (next || prev) this.queue(update);
			}));
	}

	protected _removeSource(source: S) {
		const value = this._context.bind(source).value;
		this._sources.delete(source);
		this.queue({remove: value});
		super._removeSource(source);
	}

	// protected subscribeSource(source: S) {
	// 	const binding = this._context.bind(source) as Binding<S, T>;
	// 	const unsubscribe = binding.subscribe((next, prev) => {
	// 		const update = {} as ListUpdate<T>;
	// 		if (prev) update.remove = prev;
	// 		if (next) update.add = next;
	// 		if (next || prev) this.next(update);
	// 	});
	// 	this._unsubscribeMap.set(source, unsubscribe);
	// }
}
