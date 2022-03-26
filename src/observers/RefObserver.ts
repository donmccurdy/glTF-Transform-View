import type { Property as PropertyDef } from '@gltf-transform/core';
import { Observer } from './Observer';
import { THREEObject } from '../utils';
import { Binding } from '../bindings';

// TODO(cleanup): Deeply tempted to pull all of the base/variant
// dealings OUT of the Ref*Observer classes. Just publish something
// like {source, base} that a stateless pipe could deal with, given
// access to the ObserverMap instances?
export class RefObserver<S extends PropertyDef, T extends THREEObject> extends Observer<S, T, T | null> {
	private _source: S | null = null;
	// private _base: T | null = null;
	// private _variant: T | null = null;

	public update(source: S | null): void {
		if (source === this._source) return;
		if (this._source) this._removeSource(this._source);
		if (source) this._addSource(source);
		this.flush();
	}

	protected flush() {
		const value = this._queue.pop() as T | null;
		this._queue.length = 0;
		this.next(value);
	}

	protected _addSource(source: S) {
		super._addSource(source);
		this._source = source;

		const binding = this._context.bind(source) as Binding<S, T>;
		this._sourceSubscriptions.get(source)!
			.push(binding.subscribe((nextBase: T | null, prevBase: T | null) => {
				// this._mapRelease(this._variant);

				// this._base = nextBase;
				// this._variant = this._mapRequest(this._base);
				// this.queue(this._variant);
				this.queue(nextBase);
			}))
	}

	protected _updateSource(source: S) {
		// const prevVariant = this._variant;
		// this._mapRelease(prevVariant);
		// this._mapUpdate()
		// this._variant = this._mapRequest(this._base);
		// if (this._variant !== prevVariant) {
		// 	this.queue(this._variant);
		// }
	}

	protected _removeSource(source: S) {
		// this._mapRelease(this._variant);
		// this._variant = null;
		// this._base = null;
		this._source = null;
		this.queue(null);

		super._removeSource(source);
	}

	public dispose() {
		// this._mapRelease(this._variant);
		super.dispose();
	}
}
