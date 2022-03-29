export interface ObjectPool<T> {
	request<U extends T>(object: U): U;
	release<U extends T>(object: U): U;
}

export class NoopPool<T> implements ObjectPool<T> {
	request<U extends T>(object: U): U { return object; }
	release<U extends T>(object: U): U { return object; }
}

export class DebugPool<T> implements ObjectPool<T> {
	private _objects: (T | null)[] = [];
	request<U extends T>(object: U): U {
		this._objects.push(object);
		return object;
	}
	release<U extends T>(object: U): U {
		for (let i = 0; i < this._objects.length; i++) {
			if (this._objects[i] === object) {
				this._objects[i] = null;
			}
		}
		return object;
	}
	list(): T[] {
		const _objects: T[] = [];
		for (const object of this._objects) {
			if (object) _objects.push(object);
		}
		return (this._objects = _objects);
	}
}

export let pool = new NoopPool<object>();

export function setObjectPool(_pool: ObjectPool<object>): void {
	pool = _pool;
}
