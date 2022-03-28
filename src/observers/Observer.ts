import type { Property as PropertyDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import type { Binding } from '../bindings';
import { Subject } from '../utils/Subject';
import { Subscription } from '../utils/EventDispatcher';
import { EmptyParams } from '../pools';

/**
 * Exposes a limited view of the RefObserver interface to objects
 * using it as an output socket.
 */
export interface Output<Value> extends Subject<Value | null> {
	detach(): void;
}

// TODO(docs): The _only_ time an observer should call .next()
// is after "forwarding" from Observer to ListObserver or
// MapObserver, correct?
// ... any, .update(...) really.

export class RefObserver<Def extends PropertyDef, Value, Params = EmptyParams> extends Subject<Value | null> implements Output<Value> {
	readonly name;
	binding: Binding<Def, Value> | null = null;
	private _bindingParamsFn: () => Params = () => ({} as Params);

	private readonly _context: UpdateContext;

	constructor(name: string, context: UpdateContext,) {
		super(null);
		this.name = name;
		this._context = context;
	}

	/**************************************************************************
	 * Child interface. (Binding (Child))
	 */

	detach() {
		this._clear();
	}

	/**************************************************************************
	 * Parent interface. (Binding (Parent), ListObserver, MapObserver)
	 */

	setParamsFn(paramsFn: () => Params): this {
		console.log('setParamsFn:' + this.name);
		this._bindingParamsFn = paramsFn;
		return this;
	}

	updateRef(def: Def | null) {
		console.log('updateRef:' + this.name);
		const binding = def ? this._context.bind(def) as Binding<Def, Value> : null;
		if (binding === this.binding) return;

		this._clear();

		if (binding) {
			this.binding = binding;
			this.binding.addOutput(this, this._bindingParamsFn);
			this.binding.publish(this);
		} else {
			this.next(null);
		}
	}

	updateParams() {
		if (this.binding) {
			this.binding.updateOutput(this);
		}
	}

	dispose() {
		this._clear();
	}

	/**************************************************************************
	 * Internal.
	 */

	private _clear() {
		if (this.binding) {
			this.binding.removeOutput(this);
			this.binding = null;
		}
	}
}

export class RefListObserver<Def extends PropertyDef, Value, Params = EmptyParams> extends Subject<Value[]> {
	readonly name: string;

	protected readonly _context: UpdateContext;

	private readonly _observers: RefObserver<Def, Value>[] = [];
	private readonly _subscriptions: Subscription[] = [];

	constructor(name: string, context: UpdateContext) {
		super([]);
		this.name = name;
		this._context = context;
	}

	updateRefList(sources: Def[]) {
		const added = new Set<Binding<Def, Value>>();
		const removed = new Set<number>();

		let needsUpdate = false;

		for (let i = 0; i < sources.length || i < this._observers.length; i++) {
			const source = sources[i];
			const observer = this._observers[i];

			if (!source) {
				removed.add(i);
				needsUpdate = true;
			} else if (!observer) {
				added.add(this._context.bind(source) as Binding<Def, Value>);
				needsUpdate = true;
			} else if (source !== observer.binding!.def) {
				observer.updateRef(source);
				needsUpdate = true;
			}
		}

		for (let i = this._observers.length; i >= 0; i--) {
			if (removed.has(i)) {
				this._remove(i);
			}
		}

		for (const add of added) {
			this._add(add);
		}

		if (needsUpdate) {
			this._publish();
		}
	}

	setParamsFn(paramsFn: () => Params): this {
		for (const observer of this._observers) {
			observer.setParamsFn(paramsFn);
		}
		return this;
	}

	updateParams() {
		for (const observer of this._observers) {
			observer.updateParams();
		}
	}

	private _add(binding: Binding<Def, Value>) {
		const observer = new RefObserver(this.name + '[]', this._context) as RefObserver<Def, Value>;
		observer.updateRef(binding.def);
		this._observers.push(observer);
		this._subscriptions.push(observer.subscribe((next) => {
			if (!next) {
				this._remove(this._observers.indexOf(observer));
			}
			this._publish();
		}));
	}

	private _remove(index: number) {
		const observer = this._observers[index];
		const unsub = this._subscriptions[index];

		unsub();
		observer.dispose();

		this._observers.splice(index, 1);
		this._subscriptions.splice(index, 1);
	}

	private _publish() {
		this.next(this._observers.map((o) => o.value!));
	}

	dispose() {
		for (const unsub of this._subscriptions) {
			unsub();
		}
		for (const observer of this._observers) {
			observer.dispose();
		}
		this._observers.length = 0;
		this._subscriptions.length = 0;
	}
}

export class RefMapObserver<Def extends PropertyDef, Value, Params = EmptyParams> extends Subject<Record<string, Value>> {
	readonly name: string;

	protected readonly _context: UpdateContext;

	private readonly _observers: Record<string, RefObserver<Def, Value>> = {};
	private readonly _subscriptions: Record<string, Subscription> = {};

	constructor(name: string, context: UpdateContext) {
		super({});
		this.name = name;
		this._context = context;
	}

	updateRefMap(keys: string[], defs: Def[]) {
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
				this._add(key, this._context.bind(nextDefs[key]) as Binding<Def, Value>);
				needsUpdate = true;
			} else if (observer.binding!.def !== nextDefs[key]) {
				observer.updateRef(nextDefs[key]);
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

	updateParams() {
		for (const key in this._observers) {
			const observer = this._observers[key];
			observer.updateParams();
		}
	}

	private _add(key: string, binding: Binding<Def, Value>) {
		const observer = new RefObserver(this.name + `[${key}]`, this._context) as RefObserver<Def, Value>;
		observer.updateRef(binding.def);

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
