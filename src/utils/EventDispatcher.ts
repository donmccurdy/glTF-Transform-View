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
