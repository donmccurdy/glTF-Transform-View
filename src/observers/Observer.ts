import type { Property as PropertyDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import type { Binding } from '../bindings';
import { Subject } from '../Subject';
import { Subscription } from '../EventDispatcher';

/**
 * Exposes a limited view of the Observer interface to objects
 * using it as an output socket.
 */
export interface Output<V> extends Subject<V | null> {
	detach(): void;
}

// TODO(impl): Where/how do change events get handled? Am I
// crazy in thinking those can just propagate with .next(value)?

// TODO(impl): MapObserver

// TODO(docs): The _only_ time an observer should call .next()
// is after "forwarding" from Observer to ListObserver or
// MapObserver, correct?

export class Observer<S extends PropertyDef, B extends Binding<S, V>, V> extends Subject<V | null> implements Output<V> {
	readonly name;
	binding: B | null = null;
	private _bindingParams: Record<string, unknown> = {};

	private readonly _context: UpdateContext;

	constructor(name: string, context: UpdateContext,) {
		super(null);
		this.name = name;
		this._context = context;
	}

	/**************************************************************************
	 * Child interface. (Binding (Child))
	 */

	/** @usage  */
	detach() {
		this._clear();
	}

	/**************************************************************************
	 * Parent interface. (Binding (Parent), ListObserver, MapObserver)
	 */

	updateSource(source: S | null) {
		const binding = source ? this._context.bind(source) as B : null;
		if (binding === this.binding) return;

		this._clear();

		if (binding) {
			this.binding = binding;
			this.binding.addOutput(this, this._bindingParams);
		}
	}

	updateParams(params: Record<string, unknown>) {
		this._bindingParams = params;
		if (this.binding) {
			this.binding.updateOutput(this, this._bindingParams);
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

export class ListObserver<S extends PropertyDef, B extends Binding<S, V>, V> extends Subject<V[]> {
	readonly name: string;

	protected readonly _context: UpdateContext;

	private readonly _observers: Observer<S, B, V>[] = [];
	private readonly _subscriptions: Subscription[] = [];

	constructor(name: string, context: UpdateContext) {
		super([]);
		this.name = name;
		this._context = context;
	}

	updateSourceList(sources: S[]) {
		const added = new Set<B>();
		const removed = new Set<number>();

		let needsUpdate = false;

		for (let i = 0; i < sources.length || i < this._observers.length; i++) {
			const source = sources[i];
			const observer = this._observers[i];

			if (!source) {
				removed.add(i);
				needsUpdate = true;
			} else if (!observer) {
				added.add(this._context.bind(source) as B);
				needsUpdate = true;
			} else if (source !== observer.binding!.def) {
				observer.updateSource(source);
				needsUpdate = true;
			}
		}

		for (let i = this._observers.length; i >= 0; i--) {
			this._remove(i);
		}

		for (const add of added) {
			this._add(add);
		}

		if (needsUpdate) {
			this.next(this._observers.map((o) => o.value!));
		}
	}

	updateParams(params: Record<string, unknown>): this {
		for (const observer of this._observers) {
			observer.updateParams(params);
		}
		return this;
	}

	private _add(binding: B) {
		const observer = new Observer(this.name + '[#]', this._context) as Observer<S, B, V>;
		observer.updateSource(binding.def);
		this._observers.push(observer);
		this._subscriptions.push(observer.subscribe((next) => {
			if (!next) {
				this._remove(this._observers.indexOf(observer));
			}
			this.next(this._observers.map((o) => o.value!));
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

export class MapObserver<S extends PropertyDef, B extends Binding<S, V>, V> extends Subject<Record<string, V>> {
	readonly name: string;

	protected readonly _context: UpdateContext;

	private readonly _observers: Record<string, Observer<S, B, V>> = {};
	private readonly _subscriptions: Record<string, Subscription> = {};

	constructor(name: string, context: UpdateContext) {
		super({});
		this.name = name;
		this._context = context;
	}

	updateSourceMap(keys: string[], sources: S[]) {
		// TODO(impl)
	}

	updateParams(params: Record<string, unknown>) {
		for (const key in this._observers) {
			const observer = this._observers[key];
			observer.updateParams(params);
		}
	}

	private _add(key: string, binding: B) {
		const observer = new Observer(this.name + `[${key}]`, this._context) as Observer<S, B, V>;
		observer.updateSource(binding.def);

		this._observers[key] = observer;
		this._subscriptions[key] = observer.subscribe((next) => {
			if (!next) {
				this._remove(key);
			}
			this.next(
				Object.fromEntries(
					Object.entries(this._observers)
						.map(([key, observer]) => [key, observer.value])
				) as Record<string, V>
			);
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
