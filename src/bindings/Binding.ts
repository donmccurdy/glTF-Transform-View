import { Property as PropertyDef } from '@gltf-transform/core';
import { RefObserver, Output } from '../observers';
import type { UpdateContext } from '../UpdateContext';
import type { Subscription } from '../utils/EventDispatcher';
import { EmptyParams, ValuePool } from '../pools';

// TODO(impl): Graph layouts are hard. Maybe just a spreadsheet debug view?

export abstract class Binding <Def extends PropertyDef, Value, Params = EmptyParams> {
	def: Def;
	value: Value;
	pool: ValuePool<Value, Params>;

	protected _context: UpdateContext;
	protected _lastUpdateID: number = -1;
	protected _subscriptions: Subscription[] = [];
	protected _outputs = new Set<Output<Value>>();
	protected _outputParamsFns = new Map<Output<Value>, () => Params>();

	protected constructor(context: UpdateContext, def: Def, value: Value, pool: ValuePool<Value>) {
		this._context = context;
		this.def = def;
		this.value = value;
		this.pool = pool;

		const onChange = () => {
			// TODO(perf): Should change / next be separated?
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

	abstract update(): void;

	publishAll(): this {
		for (const output of this._outputs) {
			this.publish(output);
		}
		return this;
	}

	publish(output: Output<Value>): this {
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
			if (value) {
				this.pool.releaseVariant(value);
			}
		}
	}

	/**************************************************************************
	 * Output.
	 */

	addOutput(output: RefObserver<Def, Value>, paramsFn: () => Params): this {
		this._outputs.add(output);
		this._outputParamsFns.set(output, paramsFn);
		// TODO(perf): ListObserver and MapObserver may advance many times during initialization.
		return this.publish(output);
	}

	updateOutput(output: RefObserver<Def, Value>): this {
		return this.publish(output);
	}

	removeOutput(output: RefObserver<Def, Value>): this {
		this._outputs.delete(output);
		this._outputParamsFns.delete(output);
		return this; // TODO(test): No publish!
	}
}
