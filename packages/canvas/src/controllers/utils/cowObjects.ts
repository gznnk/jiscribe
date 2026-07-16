/**
 * Copy-on-write view over the objects map for per-frame drag updates (#213).
 *
 * Cloning the map per pointermove frame is O(1) and writes are O(changed),
 * instead of the O(all objects) full spread. The Proxy preserves plain-record
 * semantics (`objects[id]`, `in`, `Object.entries`, spread), so consumers
 * cannot tell it apart from a plain Record; a leaked view stays correct.
 *
 * Views are frozen once their frame's handler returns (nothing mutates them
 * afterwards). Persistent state must not accumulate views: materialize back
 * to a plain Record at the gesture end choke point (handleGesture) or right
 * after a one-shot command update.
 */

const COW_META = Symbol("cowObjectsMeta");

type CowMeta<V> = {
	base: Record<string, V>;
	overlay: Map<string, V>;
};

const getCowMeta = <V>(objects: Record<string, V>): CowMeta<V> | null =>
	((objects as Record<symbol, unknown>)[COW_META] as CowMeta<V>) ?? null;

const hasOwn = (record: object, key: string): boolean =>
	Object.prototype.hasOwnProperty.call(record, key);

/**
 * Returns a writable copy-on-write view of srcObjects (O(1), no key copy).
 * A view over an existing view is rebased onto the same backing map
 * (overlay cloned, O(changed)), so chains never build up.
 */
export function createCowObjects<V>(
	srcObjects: Record<string, V>,
): Record<string, V> {
	const srcMeta = getCowMeta(srcObjects);
	const meta: CowMeta<V> = srcMeta
		? { base: srcMeta.base, overlay: new Map(srcMeta.overlay) }
		: { base: srcObjects, overlay: new Map() };
	const { base, overlay } = meta;

	return new Proxy({} as Record<string, V>, {
		get(_target, key) {
			if (key === COW_META) {
				return meta;
			}
			if (typeof key === "symbol") {
				return Reflect.get(base, key);
			}
			return overlay.has(key) ? overlay.get(key) : base[key];
		},
		set(_target, key, value) {
			if (typeof key === "symbol") {
				throw new Error("createCowObjects: symbol keys are not supported");
			}
			overlay.set(key, value as V);
			return true;
		},
		has(_target, key) {
			if (typeof key === "symbol") {
				return Reflect.has(base, key);
			}
			return overlay.has(key) || key in base;
		},
		deleteProperty() {
			throw new Error(
				"createCowObjects: delete is not supported; use materializeObjects first",
			);
		},
		defineProperty(_target, key, descriptor) {
			if (
				typeof key === "symbol" ||
				!hasOwn(descriptor, "value") ||
				descriptor.enumerable === false ||
				descriptor.writable === false ||
				descriptor.configurable === false
			) {
				throw new Error(
					"createCowObjects: only plain value assignment is supported",
				);
			}
			overlay.set(key, descriptor.value as V);
			return true;
		},
		ownKeys(_target) {
			const keys: (string | symbol)[] = Reflect.ownKeys(base);
			for (const key of overlay.keys()) {
				if (!hasOwn(base, key)) {
					keys.push(key);
				}
			}
			return keys;
		},
		getOwnPropertyDescriptor(_target, key) {
			if (typeof key !== "symbol" && overlay.has(key)) {
				return {
					value: overlay.get(key),
					writable: true,
					enumerable: true,
					configurable: true,
				};
			}
			const descriptor = Object.getOwnPropertyDescriptor(base, key);
			// Must report configurable: true because the proxy target does not own the key
			return descriptor ? { ...descriptor, configurable: true } : undefined;
		},
	});
}

/**
 * Flattens a copy-on-write view back into a plain Record (O(all objects), once
 * per gesture). Plain records pass through unchanged, keeping the
 * "new reference only when changed" contract intact.
 */
export function materializeObjects<V>(
	objects: Record<string, V>,
): Record<string, V> {
	const meta = getCowMeta(objects);
	if (!meta) {
		return objects;
	}

	const materialized = { ...meta.base };
	for (const [key, value] of meta.overlay) {
		materialized[key] = value;
	}
	return materialized;
}
