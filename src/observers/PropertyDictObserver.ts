import type { Property as PropertyDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import type { Binding } from '../bindings';
import { Observer } from './Observer';
import { THREEObject, SubjectSubscription } from '../utils';

export interface MapUpdate<K, V> {
	key: K,
	value: V | null,
}

export class PropertyMapObserver<S extends PropertyDef, T extends THREEObject> extends Observer<MapUpdate<string, T>> {
	private _sources: {[key: string]: S} = {};
	private _unsubscribeMap = new Map<S, SubjectSubscription>();

	constructor(public readonly name: string, private _context: UpdateContext) {
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

			const nextRenderer = context.bind(nextSource) as Binding<S, T>;
			this.next({key, value: nextRenderer.value}) // Emit added item.
		}

		// Update.
		if (context.deep) {
			for (const key in this._sources) {
				context.bind(this._sources[key]).updateOnce();
			}
		}
	}

	public dispose() {
		for (const [_, unsubscribe] of this._unsubscribeMap) {
			unsubscribe();
		}
		super.dispose();
	}

	protected subscribeSource(key: string, source: S) {
		const renderer = this._context.bind(source) as Binding<S, T>;
		const unsubscribe = renderer.subscribe((next) => this.next({key, value: next}));
		this._unsubscribeMap.set(source, unsubscribe);
	}

	protected unsubscribeSource(source: S) {
		const unsubscribe = this._unsubscribeMap.get(source)!;
		unsubscribe();
		this._unsubscribeMap.delete(source);
	}
}
