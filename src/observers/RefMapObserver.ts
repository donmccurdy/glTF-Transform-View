import type { Property as PropertyDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import type { Binding } from '../bindings';
import { Observer } from './Observer';
import { THREEObject, Subscription } from '../utils';

export interface MapUpdate<K, V> {
	key: K,
	value: V | null,
}

export class RefMapObserver<S extends PropertyDef, T extends THREEObject> extends Observer<S, T, MapUpdate<string, T>> {
	private _sources: {[key: string]: S} = {};

	constructor(name: string, context: UpdateContext) {
		super(name, context, {key: '', value: null});
	}

	protected flush() {
		const kv: Record<string, T | null> = {};
		for (const evt of this._queue) {
			kv[evt.key] = evt.value;
		}
		for (const key in kv) {
			const value = kv[key];
			this.next({key, value});
		}
	}

	public update(keys: string[], sources: S[]): void {
		const context = this._context;

		// TODO(bug): RefMap may have ≥2 of the same source.

		const nextSources: {[key: string]: S} = {};
		for (let i = 0; i < keys.length; i++) nextSources[keys[i]] = sources[i];

		// Remove.
		for (const key in this._sources) {
			const prevSource = this._sources[key];
			const nextSource = nextSources[key];
			if (prevSource === nextSource) continue;

			this._removeSourceByKey(key);
		}

		// Add.
		for (const key in nextSources) {
			const prevSource = this._sources[key];
			const nextSource = nextSources[key];
			if (prevSource === nextSource) continue;

			this._addSourceByKey(key, nextSource);
		}

		this.flush();
	}

	protected _addSourceByKey(key: string, source: S) {
		this._sources[key] = source;
		const binding = this._context.bind(source) as Binding<S, T>;
		this.queue({key, value: binding.value})
	}

	protected _removeSourceByKey(key: string) {
		const source = this._sources[key];
		this.queue({key, value: null});
		// TODO(bug): RefMap may have ≥2 of the same source.
		super._removeSource(source);
	}

	protected _removeSource(source: S) {
		let key: string;
		for (const _key in this._sources) {
			if (this._sources[_key] === source) {
				this._removeSourceByKey(_key);
			}
		}
	}

	// public dispose() {
	// 	for (const [_, unsubscribe] of this._unsubscribeMap) {
	// 		unsubscribe();
	// 	}
	// 	super.dispose();
	// }

	// protected subscribeSource(key: string, source: S) {
	// 	const binding = this._context.bind(source) as Binding<S, T>;
	// 	const unsubscribe = binding.subscribe((next) => this.next({key, value: next}));
	// 	this._unsubscribeMap.set(source, unsubscribe);
	// }

	// protected unsubscribeSource(source: S) {
	// 	const unsubscribe = this._unsubscribeMap.get(source)!;
	// 	unsubscribe();
	// 	this._unsubscribeMap.delete(source);
	// }
}
