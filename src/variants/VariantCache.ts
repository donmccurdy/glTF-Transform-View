export interface THREEObject {
	uuid: string;
	name: string;
	type: string | number;
}

interface CacheEntry<V, P> {
	variant: V,
	params: P,
	users: number,
}

/**
 * Abstract cache, supporting reuse of 'variant' objects derived from 'source'
 * objects, given a parameter set. Objects in the cache are disposed after no
 * users remain.
 *
 * See: {@link PropertyVariantObserver}
 */
export class VariantCache<S extends THREEObject, V extends THREEObject, P> {
	readonly _cache: Map<S, {[key: string]: CacheEntry<V,P>}> = new Map();

	constructor(
		private readonly _name: string,
		private readonly _createVariant: (t: S, p: P) => V,
		private readonly _updateVariant: (s: S, v: V, p: P) => V,
		private readonly _disposeVariant: (v: V) => void
	) {}

	private _key(value: S, params: P) {
		return value.uuid + ':' + Object.values(params).join(':');
	}

	/** Borrow an instance from the pool, creating it if necessary. */
	public getVariant(value: S, params: P): V {
		const key = this._key(value, params);

		let cache = this._cache.get(value);
		if (!cache) this._cache.set(value, cache = {});

		if (cache[key]) {
			cache[key].users++;
			return cache[key].variant;
		}

		const variant = this._createVariant(value, params);
		cache[key] = {users: 1, variant, params};

		return variant;
	}

	public updateSource(srcValue: S): void {
		const cacheMap = this._cache.get(srcValue)!;
		for (const key in cacheMap) {
			const cache = cacheMap[key];
			this._updateVariant(srcValue, cache.variant, cache.params);
		}
	}

	/** Return a variant to the pool, destroying it if no users remain. */
	public releaseVariant(variant: V) {
		for (const [base, cache] of this._cache) {
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

	/** Dump cache debug state to console. */
	public _debug() {
		for (const [base, cache] of this._cache) {
			let users = 0;
			for (const key in cache) users += cache[key].users;
			console.debug(`${this._name}::${base.type}::"${base.name}" → ${Object.keys(cache).length} variants, ${users} users`);
		}
	}
}
