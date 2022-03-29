import type { Property as PropertyDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import type { Binding } from '../bindings';
import { Subject } from '../utils/Subject';
import { Subscription } from '../utils/EventDispatcher';
import { EmptyParams } from '../pools';
import { RefObserver } from './RefObserver';

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