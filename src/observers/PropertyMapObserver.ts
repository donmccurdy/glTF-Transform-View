import type { Property as PropertyDef } from '@gltf-transform/core';
import type { RenderPair } from '../RenderPair';
import type { UpdateContext } from '../SyncContext';
import { Observer, Subscription } from './Observer';

export interface MapUpdate<K, V> {
	key: K,
	value: V | null,
}

export class PropertyMapObserver<S extends PropertyDef, T> extends Observer<MapUpdate<string, T>> {
	private _sources: {[key: string]: S} = {};
	private _unsubscribeMap = new Map<S, Subscription>();

	constructor(private _context: UpdateContext) {
		super({key: '', value: null});
	}

	public update(keys: string[], sources: S[]): void {
		const context = this._context;

		const nextSources: {[key: string]: S} = {};
		for (let i = 0; i < keys.length; i++) nextSources[keys[i]] = sources[i];

		// Remove.
		for (const key in this._sources) {
			const prevSource = this._sources[key];
			const nextSource = nextSources[key];
			if (prevSource === nextSource) continue;

			delete this._sources[key];
			this.unsubscribeSource(prevSource);

			if (nextSource) continue;
			this.next({key, value: null}); // Emit removed item.
		}

		// Add.
		for (const key in nextSources) {
			const prevSource = this._sources[key];
			const nextSource = nextSources[key];
			if (prevSource === nextSource) continue;

			this._sources[key] = nextSource;
			this.subscribeSource(key, nextSource);

			const nextPair = context.pair(nextSource) as RenderPair<S, T>;
			this.next({key, value: nextPair.value}) // Emit added item.
		}
	}

	public dispose() {
		for (const [_, unsubscribe] of this._unsubscribeMap) {
			unsubscribe();
		}
		super.dispose();
	}

	protected subscribeSource(key: string, source: S) {
		const pair = this._context.pair(source) as RenderPair<S, T>;
		const unsubscribe = pair.subscribe((next) => this.next({key, value: next}));
		this._unsubscribeMap.set(source, unsubscribe);
	}

	protected unsubscribeSource(source: S) {
		const unsubscribe = this._unsubscribeMap.get(source)!;
		unsubscribe();
		this._unsubscribeMap.delete(source);
	}
}
