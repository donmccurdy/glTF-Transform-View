import { Property as PropertyDef } from '@gltf-transform/core';
import { Output } from '../observers';
import type { UpdateContext } from '../UpdateContext';
import type { Subscription } from '../constants';
import { EmptyParams, ValuePool } from '../pools';

// TODO(feat): Graph layouts are hard. Maybe just a spreadsheet debug view?

/**
 * Implementation of BehaviorSubject pattern, emitting three.js objects when changes
 * occur in glTF definitions.
 *
 * Each glTF definition (e.g. `Material`) is bound to a single Subject (e.g. `MaterialSubject`).
 * The Subject is responsible for receiving change events published by the definition, generating a
 * derived three.js object (e.g. `THREE.Material`), and publishing the new value to all Observers. More
 * precisely, this is a [*BehaviorSubject*](https://reactivex.io/documentation/subject.html), which holds
 * a single current value at any given time.
 */
export abstract class Subject<Def extends PropertyDef, Value, Params = EmptyParams> {
	def: Def;
	value: Value;
	pool: ValuePool<Value, Params>;

	protected _context: UpdateContext;
	protected _subscriptions: Subscription[] = [];
	protected _outputs = new Set<Output<Value>>();
	protected _outputParamsFns = new Map<Output<Value>, () => Params>();

	protected constructor(context: UpdateContext, def: Def, value: Value, pool: ValuePool<Value>) {
		this._context = context;
		this.def = def;
		this.value = value;
		this.pool = pool;

		const onChange = () => {
			this.update();
			this.publishAll();
		};
		const onDispose = () => this.dispose();

		def.addEventListener('change', onChange);
		def.addEventListener('dispose', onDispose);

		this._subscriptions.push(
			() => def.removeEventListener('change', onChange),
			() => def.removeEventListener('dispose', onDispose),
		);
	}

	/**************************************************************************
	 * Lifecycle.
	 */

	// TODO(perf): Many publishes during an update (e.g. Material). Consider batching.
	abstract update(): void;

	publishAll(): this {
		// Prevent publishing updates during disposal.
		if (this._context.isDisposed()) return this;

		for (const output of this._outputs) {
			this.publish(output);
		}
		return this;
	}

	publish(output: Output<Value>): this {
		// Prevent publishing updates during disposal.
		if (this._context.isDisposed()) return this;

		if (output.value) {
			this.pool.releaseVariant(output.value);
		}
		const paramsFn = this._outputParamsFns.get(output)!;
		output.next(this.pool.requestVariant(this.value, paramsFn()));
		return this;
	}

	dispose(): void {
		for (const unsub of this._subscriptions) unsub();
		if (this.value) {
			this.pool.releaseBase(this.value);
		}

		for (const output of this._outputs) {
			const value = output.value;
			output.detach();
			output.next(null);
			if (value) this.pool.releaseVariant(value);
		}
	}

	/**************************************************************************
	 * Output API — Used by RefObserver.ts
	 */

	/**
	 * Adds an output, which will receive future published values.
	 * _Only for use of RefObserver.ts._
	 */
	addOutput(output: Output<Value>, paramsFn: () => Params) {
		this._outputs.add(output);
		this._outputParamsFns.set(output, paramsFn);
	}

	/**
	 * Removes an output, which will no longer receive published values.
	 * _Only for use of RefObserver.ts._
	 */
	removeOutput(output: Output<Value>) {
		const value = output.value;
		this._outputs.delete(output);
		this._outputParamsFns.delete(output);
		if (value) this.pool.releaseVariant(value);
	}
}
