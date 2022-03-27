import { Property as PropertyDef } from '@gltf-transform/core';
import { Observer, Output } from '../observers';
import type { UpdateContext } from '../UpdateContext';
import type { Subscription } from '../EventDispatcher';

// TODO(impl): Lifecycle for base values.
// TODO(impl): Lifecycle for output values.
// TODO(impl): Graph layouts are hard. Maybe just a spreadsheet debug view?

export abstract class Binding <Def extends PropertyDef, Value> {
	def: Def;
	value: Value;

	protected _context: UpdateContext;
	protected _lastUpdateID: number = -1;
	protected _subscriptions: Subscription[] = [];
	protected _outputs = new Set<Output<Value>>();
	protected _outputParams = new Map<Output<Value>, Record<string, unknown>>();

	protected constructor(context: UpdateContext, def: Def, value: Value) {
		this._context = context;
		this.def = def;
		this.value = value;

		const onChange = () => this.update();
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

	abstract update(): this;

	// TODO(impl): Should be able to dispose base and variant values.
	abstract disposeValue(value: Value): void;

	requestValue(output: Output<Value>): Value {
		// TODO(impl): Variation.
		// const outputParams = this._outputParams.get(output);
		return this.value;
	}

	releaseValue(value: Value): void {
		// TODO(impl): Reference counting and disposal.
	}

	publishAll(): this {
		for (const output of this._outputs) {
			this.publish(output);
		}
		return this;
	}

	publish(output: Output<Value>): this {
		if (output.value) {
			this.releaseValue(output.value);
		}
		output.next(this.requestValue(output));
		return this;
	}

	dispose(): void {
		for (const unsub of this._subscriptions) unsub();
		if (this.value) {
			this.releaseValue(this.value); // TODO(test): Necessary?
			this.disposeValue(this.value);
		}

		for (const output of this._outputs) {
			const outputValue = output.value;
			output.detach();
			output.next(null);
			if (outputValue) {
				this.releaseValue(outputValue); // TODO(test): Necessary?
				this.disposeValue(outputValue);
			}
		}
	}

	/**************************************************************************
	 * Output.
	 */

	addOutput(output: Observer<Def, Binding<Def, Value>, Value>, params: Record<string, unknown>): this {
		this._outputs.add(output);
		this._outputParams.set(output, params);
		// TODO(perf): ListObserver and MapObserver may advance many times during initialization.
		return this.publish(output);
	}

	updateOutput(output: Observer<Def, Binding<Def, Value>, Value>, params: Record<string, unknown>): this {
		this._outputParams.set(output, params);
		return this.publish(output);
	}

	removeOutput(output: Observer<Def, Binding<Def, Value>, Value>): this {
		this._outputs.delete(output);
		this._outputParams.delete(output);
		return this; // TODO(test): No publish!
	}
}
