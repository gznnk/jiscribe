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
	return getCowMeta(objects) ? copyObjectsRecord(objects) : objects;
}

/**
 * Returns a fresh, writable plain Record holding the same entries — the
 * drop-in replacement for `{ ...objects }` on a path that may be handed a
 * copy-on-write view.
 *
 * Spreading a view goes through the Proxy's `ownKeys` plus one
 * `getOwnPropertyDescriptor` trap per key, which costs several times what the
 * same spread costs on a plain Record. Reading the backing map and the overlay
 * directly produces the identical Record without touching a single trap.
 *
 * Unlike {@link materializeObjects}, a plain Record is copied rather than passed
 * through: callers of this one want a copy they may write to.
 */
export function copyObjectsRecord<V>(
	objects: Record<string, V>,
): Record<string, V> {
	const meta = getCowMeta(objects);
	if (!meta) {
		return { ...objects };
	}

	const copied = { ...meta.base };
	for (const [key, value] of meta.overlay) {
		copied[key] = value;
	}
	return copied;
}

/**
 * The IDs whose value may differ between two object maps, or null when that
 * cannot be decided without comparing every entry.
 *
 * A non-null result is exact in the strong sense: every ID **absent** from it is
 * guaranteed to hold the very same object reference in both maps. That is what
 * lets a per-frame pass skip the whole map and look only at what the transition
 * touched — during a drag the overlay holds the dragged objects alone, so an
 * O(all objects) scan collapses to O(moved objects).
 *
 * The guarantee holds because both maps then read every untouched ID from the
 * same backing Record, and a view can never delete a key (`deleteProperty`
 * throws). Taking the union of both overlays — rather than assuming the newer
 * view derives from the older one — keeps that true even for two views built
 * independently from the same base.
 *
 * @param objects - The newer map, typically the transition's result
 * @param previousObjects - The map to diff against, typically the state the
 *   transition started from
 * @returns The IDs to inspect, or null when the two maps share no backing
 *   Record and the caller must fall back to a full scan
 */
export function collectCowChangedKeys<V>(
	objects: Record<string, V>,
	previousObjects: Record<string, V>,
): Set<string> | null {
	const meta = getCowMeta(objects);
	if (!meta) {
		return null;
	}
	const previousMeta = getCowMeta(previousObjects);
	const sharesBase = previousMeta
		? previousMeta.base === meta.base
		: previousObjects === meta.base;
	if (!sharesBase) {
		return null;
	}

	const changedKeys = new Set(meta.overlay.keys());
	if (previousMeta) {
		for (const key of previousMeta.overlay.keys()) {
			changedKeys.add(key);
		}
	}
	return changedKeys;
}
