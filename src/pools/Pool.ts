export type EmptyParams = {} | null | undefined;

export interface ValuePool<Value, Params = EmptyParams> {
	requestBase(base: Value): Value;
	releaseBase(base: Value): void;

	requestVariant(base: Value, params: Params): Value;
	releaseVariant(variant: Value): void;

	dispose(): void;

	debug(): void;
}

export class Pool<Value> implements ValuePool<Value> {
	requestBase(base: Value): Value { return base; }
	releaseBase(base: Value): void {}

	requestVariant(base: Value, _params: EmptyParams) {
		return base;
	}
	releaseVariant(variant: Value): void {}

    dispose(): void {
        throw new Error('Method not implemented.');
    }
    debug(): void {
        throw new Error('Method not implemented.');
    }
}
