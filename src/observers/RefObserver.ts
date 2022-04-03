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

/**
 * Represents a connection between one Binding's output and another
 * Binding's input. RefObserver should let the Binding call .next(),
 * generally avoiding calling .next() itself. The RefObserver is a passive pipe.
 */
export class RefObserver<Def extends PropertyDef, Value, Params = EmptyParams> extends Subject<Value | null> implements Output<Value> {
	readonly name: string;

	private _binding: Binding<Def, Value> | null = null;
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
		return this._binding ? this._binding.def : null;
	}

	updateDef(def: Def | null) {
		const binding = def ? this._context.bind(def) as Binding<Def, Value> : null;
		if (binding === this._binding) return;

		this._clear();

		if (binding) {
			this._binding = binding;
			this._binding.addOutput(this, this._bindingParamsFn);
			this._binding.publish(this);
		} else {
			// In most cases RefObserver should let the Binding call .next() itself,
			// but this is the exception since the binding is gone.
			this.next(null);
		}
	}

	/**
	 * Forces the observed Binding to re-evaluate the output. For use when
	 * output parameters are likely to have changed.
	 */
	invalidate() {
		if (this._binding) {
			this._binding.publish(this);
		}
	}

	dispose() {
		this._clear();
	}

	/**************************************************************************
	 * Internal.
	 */

	private _clear() {
		if (this._binding) {
			this._binding.removeOutput(this);
			this._binding = null;
		}
	}
}
