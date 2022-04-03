import type { Property as PropertyDef } from '@gltf-transform/core';
import type { UpdateContext } from '../UpdateContext';
import type { Binding } from '../bindings';
import { Subject } from '../utils/Subject';
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
	readonly name: string;
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

	next(value: Value | null) {
		// Prevent publishing updates during disposal.
		if (!this._context.isDisposed()) {
			super.next(value);
		}
	}

	/**************************************************************************
	 * Parent interface. (Binding (Parent), ListObserver, MapObserver)
	 */

	setParamsFn(paramsFn: () => Params): this {
		this._bindingParamsFn = paramsFn;
		return this;
	}

	getDef(): Def | null {
		return this.binding ? this.binding.def : null;
	}

	updateDef(def: Def | null) {
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
