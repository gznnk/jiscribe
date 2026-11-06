import type { Dimensions, Point } from "@jiscribe/geometry";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type {
	ObjectOutlineCalculator,
	ObjectOutlineRegistry,
} from "../../../registry/ObjectOutlineRegistry";

type OutlineRegistry = Pick<ObjectOutlineRegistry, "get">;

type OutlineCacheEntry = {
	/** The calculator the outline came from, so a type registered again recomputes. */
	calculator: ObjectOutlineCalculator;
	outline: readonly Point[];
};

// Keyed on the registry first because the same type can be registered differently
// on two canvases.
const entriesByOutlineRegistry = new WeakMap<
	OutlineRegistry,
	WeakMap<ObjectState, OutlineCacheEntry>
>();

/**
 * The outline the type of `obj` registers, computed once per state object.
 *
 * Sound only because canvas states are never mutated, so a state the reducer
 * still holds keeps the outline it was computed from whatever fields the
 * calculator reads (the callout's `tail`).
 *
 * @param obj - A state the reducer holds (never one assembled or written in place), whose identity is the cache key; frame-ness is the caller's to check
 * @param outlineRegistry - Per-canvas ObjectOutlineRegistry; outlines are never shared between two registries
 * @returns The local outline polygon, the same array for the same state; read only, as every reader of the state shares it. Undefined when the type registers no outline
 */
export const readCachedObjectOutline = (
	obj: ObjectState & Dimensions,
	outlineRegistry: OutlineRegistry,
): readonly Point[] | undefined => {
	const calculator = outlineRegistry.get(obj.type);
	if (calculator === undefined) {
		return undefined;
	}
	let entries = entriesByOutlineRegistry.get(outlineRegistry);
	if (entries === undefined) {
		entries = new WeakMap();
		entriesByOutlineRegistry.set(outlineRegistry, entries);
	}
	const cached = entries.get(obj);
	if (cached !== undefined && cached.calculator === calculator) {
		return cached.outline;
	}
	const outline = calculator(obj);
	entries.set(obj, { calculator, outline });
	return outline;
};
