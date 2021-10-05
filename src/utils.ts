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

export class Subject<T> {
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