export type Subscription = () => void;

export class Observer<T> {
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

	public dispose() {
		this._listeners.length = 0;
	}
}
