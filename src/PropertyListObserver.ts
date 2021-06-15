import { Property as PropertyDef } from '@gltf-transform/core';
import { Observer, Subscription } from './Observer';
import type { RenderPair } from './RenderPair';
import { UpdateContext } from './SyncContext';

export interface ListUpdate<T> {
	remove?: T,
	add?: T,
}

export class PropertyListObserver<S extends PropertyDef, T> extends Observer<ListUpdate<T>> {
	private _sources = new Set<S>();
	private _unsubscribeMap = new Map<S, Subscription>();

	constructor(private _context: UpdateContext) {
		super({});
	}

	public update(sources: S[]): void {
		const context = this._context;
		const nextSources = new Set(sources);

		// Remove.
		for (const prevSource of this._sources) {
			if (nextSources.has(prevSource)) continue;

			this._sources.delete(prevSource);
			this.unsubscribeSource(prevSource);
			const prevPair = context.pair(prevSource) as RenderPair<S, T>;
			this.next({remove: prevPair.value}); // Emit removed item.
		}

		// Add.
		for (const nextSource of nextSources) {
			if (this._sources.has(nextSource)) continue;

			this._sources.add(nextSource);
			this.subscribeSource(nextSource); // Emit added item.
		}
	}

	public dispose() {
		for (const [_, unsubscribe] of this._unsubscribeMap) {
			unsubscribe();
		}
		super.dispose();
	}

	protected subscribeSource(source: S) {
		const pair = this._context.pair(source) as RenderPair<S, T>;
		const unsubscribe = pair.subscribe((next, prev) => {
			const update = {} as ListUpdate<T>;
			if (prev) update.remove = prev;
			if (next) update.add = next;
			if (next || prev) this.next(update);
		});
		this._unsubscribeMap.set(source, unsubscribe);
	}

	protected unsubscribeSource(source: S) {
		const unsubscribe = this._unsubscribeMap.get(source)!;
		unsubscribe();
		this._unsubscribeMap.delete(source);
	}
}
