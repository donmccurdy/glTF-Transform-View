import { THREEObject } from '../utils';

interface CacheEntry<V, P> {
	variant: V,
	params: P,
	users: number,
}

/**
 * Enables an Observer to 'map' incoming values to variants derived from the
 * source objects, given a parameter set. Values are cached and disposed after
 * no users remain.
 *
 * Example: MaterialMap is used to map incoming materials to the appropriate
 * Point/Line/Mesh materials needed for a particular primitive.
 */
export abstract class ObserverMap<S extends THREEObject, V extends THREEObject, P> {
	readonly _cache: Map<S, {[key: string]: CacheEntry<V,P>}> = new Map();

	constructor(private readonly _name: string) {}

	protected abstract _createVariant(t: S, p: P): V;
	protected abstract _updateVariant(s: S, v: V, p: P): V;
	protected abstract _disposeVariant(v: V): void;

	private _key(params: P) {
		return Object.values(params).join(':');
	}

	/** Borrow an instance from the pool, creating it if necessary. */
	public requestVariant(value: S, params: P): V {
		let cache = this._cache.get(value);
		if (!cache) this._cache.set(value, cache = {});

		const key = this._key(params);
		if (cache[key]) {
			cache[key].users++;
			return cache[key].variant;
		}

		const variant = this._createVariant(value, params);
		cache[key] = {users: 1, variant, params};

		return variant;
	}

	public updateVariant(s: S, v: V, p: P): V {
		return this._updateVariant(s, v, p);
	}

	/** Return a variant to the pool, destroying it if no users remain. */
	public releaseVariant(variant: V) {
		for (const [_, cache] of this._cache) {
			for (const key in cache) {
				const entry = cache[key];
				if (entry.variant !== variant) continue;

				entry.users--;
			}
		}
	}

	/** Disposes of unused variants. */
	public flush() {
		for (const [base, cache] of this._cache) {
			for (const key in cache) {
				const entry = cache[key];
				if (entry.users > 0) continue;

				this._disposeVariant(entry.variant);
				delete cache[key];
				if (Object.keys(cache).length > 0) continue;

				this._cache.delete(base);
			}
		}
	}

	/** Disposes of all variants associated with this cache. */
	public dispose() {
		for (const [base, cache] of this._cache) {
			for (const key in cache) {
				const entry = cache[key];

				this._disposeVariant(entry.variant);
				delete cache[key];

				this._cache.delete(base);
			}
		}
	}

	/** Dump cache debug state to console. */
	public _debug() {
		for (const [base, cache] of this._cache) {
			let users = 0;
			for (const key in cache) users += cache[key].users;
			console.debug(`${this._name}::${(base as any).type || ''}::"${base.name}" → ${Object.keys(cache).length} variants, ${users} users`);
		}
		if (this._cache.size === 0) {
			console.debug(`${this._name}::empty`);
		}
	}
}
