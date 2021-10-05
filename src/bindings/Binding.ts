import { Property as PropertyDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import { Subscription } from '../utils';

class Subject<T> {
	public value: T;
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
}

export abstract class Binding <Source extends PropertyDef, Target> extends Subject<Target> {
	public source: Source;

	protected _context: UpdateContext;
	protected _lastUpdateID: number = -1;
	protected _targetUnsubscribe: Subscription;

	protected constructor(context: UpdateContext, source: Source, target: Target) {
		super(target);
		this._context = context;
		this.source = source;

		this._targetUnsubscribe = this.subscribe((next, prev) => {
			if (prev && prev !== next) this.disposeTarget(prev);
		});
	}

	public abstract update(): this;

	public updateOnce(): this {
		if (this._context.deep && this._lastUpdateID < this._context.updateID) {
			this._lastUpdateID = this._context.updateID;
			this.update();
		}
		return this;
	}

	public dispose(): void {
		this._targetUnsubscribe();
		if (this.value) this.disposeTarget(this.value);
		super.dispose();
	}

	public abstract disposeTarget(target: Target): void;
}
