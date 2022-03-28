import { EventDispatcher, Subscription } from "./EventDispatcher";

export class Subject<T> extends EventDispatcher {
	public value: T;
	private _subscribers: ((next: T, prev: T | null) => void)[] = [];

	constructor(value: T) {
		super();
		this.value = value;
	}

	public subscribe(listener: (next: T, prev: T | null) => void): Subscription {
		this._subscribers.push(listener);
		// TODO(cleanup): Don't really want this in Observer...
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
