import { Property as PropertyDef } from "@gltf-transform/core";

export function eq(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

export interface THREEObject {
	name: string;
}

export type Subscription = () => void;

export interface Event {
	type: string;
	target: EventDispatcher;
}

export class EventDispatcher {
	private _listeners: {[type: string]: ((evt: Event) => void)[]} = {};

	public dispatchEvent(type: string, event: Record<string, unknown>): void {
		const fns = this._listeners[type];
		if (!fns) return;
		for (const fn of fns) {
			fn({type, target: this, ...event});
		}
	}

	public on(type: string, fn: (evt: Event) => void): Subscription {
		this._listeners[type] = this._listeners[type] || [];
		this._listeners[type].push(fn);
		return () => {
			const fnIndex = this._listeners[type].indexOf(fn);
			this._listeners[type].splice(fnIndex, 1);
		}
	}

	public dispose() {
		for (const type in this._listeners) {
			delete this._listeners[type];
		}
	}
}

export class Subject<T> extends EventDispatcher {
	public value: T;
	private _subscribers: ((next: T, prev: T | null) => void)[] = [];

	constructor(value: T) {
		super();
		this.value = value;
	}

	public subscribe(listener: (next: T, prev: T | null) => void): Subscription {
		this._subscribers.push(listener);
		// NOTE: Don't really want this in Observer...
		// listener(this.value, null);
		return () => {
            this._subscribers.splice(this._subscribers.indexOf(listener), 1);
        };
	}

	public next(value: T) {
		for (const listener of this._subscribers) {
			listener(value, this.value);
		}
		this.value = value;
	}

	public dispose() {
		this._subscribers.length = 0;
	}
}
