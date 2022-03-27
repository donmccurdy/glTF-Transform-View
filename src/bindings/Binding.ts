import { Property as PropertyDef } from '@gltf-transform/core';
import { Observer, Output } from '../observers/Observer';
import type { UpdateContext } from '../UpdateContext';
import { Subscription } from '../utils';

// TODO(impl): Lifecycle for base values.
// TODO(impl): Lifecycle for output values.
// TODO(impl): Graph layouts are hard. Maybe just a spreadsheet debug view?

export abstract class Binding <Source extends PropertyDef, Target> {
	public source: Source;
	public value: Target;

	protected _context: UpdateContext;
	protected _lastUpdateID: number = -1;
	protected _subscriptions: Subscription[] = [];
	protected _outputs = new Set<Output<Target>>();
	protected _outputParams = new Map<Output<Target>, Record<string, unknown>>();

	protected constructor(context: UpdateContext, source: Source, target: Target) {
		this._context = context;
		this.source = source;
		this.value = target;

		const onChange = () => this.update();
		const onDispose = () => this.dispose();

		source.addEventListener('change', onChange);
		source.addEventListener('dispose', onDispose);

		this._subscriptions.push(
			() => source.removeEventListener('change', onChange),
			() => source.removeEventListener('dispose', onDispose),
		);
	}

	/**************************************************************************
	 * Lifecycle.
	 */

	public abstract update(): this;

	public abstract disposeTarget(target: Target): void;

	dispose(): void {
		for (const unsub of this._subscriptions) unsub();
		if (this.value) this.disposeTarget(this.value);

		for (const output of this._outputs) {
			output.detach();
			output.next(null); // TODO(release)
		}
	}

	/**************************************************************************
	 * Output.
	 */

	addOutput(output: Observer<Source, Binding<Source, Target>, Target>, params: Record<string, unknown>): this {
		this._outputs.add(output);
		this._outputParams.set(output, params);
		// TODO(test): Can we avoid advancing output here? If we do advance output it puts ListObserver at risk
		// of publishing a lot of results...
		return this;
	}

	updateOutput(output: Observer<Source, Binding<Source, Target>, Target>, params: Record<string, unknown>): this {
		this._outputParams.set(output, params);
		// TODO(impl): push next
		// TODO(test): For consistency with above maybe this should be explicit, or renamed?
		return this;
	}

	removeOutput(output: Observer<Source, Binding<Source, Target>, Target>): this {
		this._outputs.delete(output);
		this._outputParams.delete(output);
		// TODO(test): No next!
		return this;
	}
}
