import type { Property as PropertyDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import type { Subject } from '../subjects';
import type { Subscription } from '../constants';
import { Observable } from '../utils';
import { EmptyParams } from '../pools';
import { RefObserver } from './RefObserver';

/** @internal */
export class RefMapObserver<Def extends PropertyDef, Value, Params = EmptyParams> extends Observable<Record<string, Value>> {
	readonly name: string;

	protected readonly _context: UpdateContext;

	private readonly _observers: Record<string, RefObserver<Def, Value>> = {};
	private readonly _subscriptions: Record<string, Subscription> = {};

	constructor(name: string, context: UpdateContext) {
		super({});
		this.name = name;
		this._context = context;
	}

	update(keys: string[], defs: Def[]) {
		const nextKeys = new Set(keys);
		const nextDefs = {} as Record<string, Def>;
		for (let i = 0; i < keys.length; i++) nextDefs[keys[i]] = defs[i];

		let needsUpdate = false;

		for (const key in this._observers) {
			if (!nextKeys.has(key)) {
				this._remove(key);
				needsUpdate = true;
			}
		}

		for (const key of keys) {
			const observer = this._observers[key];
			if (!observer) {
				this._add(key, this._context.bind(nextDefs[key]) as Subject<Def, Value>);
				needsUpdate = true;
			} else if (observer.getDef() !== nextDefs[key]) {
				observer.update(nextDefs[key]);
				needsUpdate = true;
			}
		}

		if (needsUpdate) {
			this._publish();
		}
	}

	setParamsFn(paramsFn: () => Params): this {
		for (const key in this._observers) {
			const observer = this._observers[key];
			observer.setParamsFn(paramsFn);
		}
		return this;
	}

	private _add(key: string, subject: Subject<Def, Value>) {
		const observer = new RefObserver(this.name + `[${key}]`, this._context) as RefObserver<Def, Value>;
		observer.update(subject.def);

		this._observers[key] = observer;
		this._subscriptions[key] = observer.subscribe((next) => {
			if (!next) {
				this._remove(key);
			}
			this._publish();
		});
	}

	private _remove(key: string) {
		const observer = this._observers[key];
		const unsub = this._subscriptions[key];

		unsub();
		observer.dispose();

		delete this._subscriptions[key];
		delete this._observers[key];
	}

	private _publish() {
		const entries = Object.entries(this._observers)
			.map(([key, observer]) => [key, observer.value]);
		this.next(Object.fromEntries(entries));
	}

	dispose() {
		for (const key in this._observers) {
			const observer = this._observers[key];
			const unsub = this._subscriptions[key];
			unsub();
			observer.dispose();
			delete this._subscriptions[key];
			delete this._observers[key];
		}
	}
}
