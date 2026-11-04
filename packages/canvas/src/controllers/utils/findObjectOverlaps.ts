import type { BoundingBox, Rect } from "@jiscribe/geometry";

import { calcObjectBoundingBox } from "./calcObjectBoundingBox";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isConnectorState } from "../../states/objects/connector/ConnectorState";
import { isGroupState } from "../../states/objects/primitives/group/GroupState";

/** Two shapes whose boxes share area, and how much. */
export type ObjectOverlap = {
	/** The overlapping pair. */
	ids: [string, string];
	/** The shared area, in world coordinates; never zero-sized. */
	overlap: Rect;
	/**
	 * How the two boxes relate:
	 * - `"first"`: `ids[0]`'s box covers `ids[1]`'s entirely
	 * - `"second"`: `ids[1]`'s box covers `ids[0]`'s entirely
	 * - `"both"`: the two boxes are the same, all four edges equal with no
	 *   tolerance
	 * - `null`: they only partly overlap, neither covering the other
	 */
	covers: "first" | "second" | "both" | null;
};

/** Whether the outer box covers every part of the inner one. */
const doesCover = (outer: BoundingBox, inner: BoundingBox): boolean =>
	outer.left <= inner.left &&
	outer.top <= inner.top &&
	outer.right >= inner.right &&
	outer.bottom >= inner.bottom;

/** ObjectOverlap's `covers` for the pair (firstBox, secondBox). */
const resolveCovers = (
	firstBox: BoundingBox,
	secondBox: BoundingBox,
): ObjectOverlap["covers"] => {
	const doesFirstCover = doesCover(firstBox, secondBox);
	const doesSecondCover = doesCover(secondBox, firstBox);
	if (doesFirstCover && doesSecondCover) {
		return "both";
	}
	if (doesFirstCover) {
		return "first";
	}
	return doesSecondCover ? "second" : null;
};

/** An object whose box takes part in the comparison, paired with that box. */
type BoxedObject = { id: string; box: BoundingBox };

/**
 * The shapes worth comparing, each with its geometry box, sorted by left edge so
 * the sweep below can stop early. Connectors are left out (a line crossing a
 * shape is how connectors are drawn) and so are groups (their members are
 * compared individually, and a group's box is only their union).
 */
const collectBoxedObjects = (
	ids: Iterable<string>,
	objects: Record<string, ObjectState>,
): BoxedObject[] => {
	const boxed: BoxedObject[] = [];
	for (const id of ids) {
		const object = objects[id];
		if (!object || isGroupState(object) || isConnectorState(object)) {
			continue;
		}
		const box = calcObjectBoundingBox(object, objects);
		if (box) {
			boxed.push({ id, box });
		}
	}
	return boxed.sort((a, b) => a.box.left - b.box.left);
};

/**
 * Finds the pairs of shapes whose boxes share area.
 *
 * Comparison is by geometry box, not by silhouette: two diamonds whose corners
 * interlock without their drawn outlines touching are still reported.
 *
 * @param ids - The shapes to compare, or every object in `objects` when
 *   omitted. Ids that are missing, grouped-only or connectors are skipped
 * @param objects - The object map, also used to resolve group children
 * @returns One entry per overlapping pair, largest shared area first; empty when
 *   nothing overlaps. Pairs that merely touch along an edge are not reported
 */
export const findObjectOverlaps = (
	ids: Iterable<string> | undefined,
	objects: Record<string, ObjectState>,
): ObjectOverlap[] => {
	const boxed = collectBoxedObjects(ids ?? Object.keys(objects), objects);

	const overlaps: ObjectOverlap[] = [];
	for (let i = 0; i < boxed.length; i++) {
		const current = boxed[i];
		for (let j = i + 1; j < boxed.length; j++) {
			const other = boxed[j];
			// Sorted by left edge: once one box starts past the current box's right
			// edge, so does every box after it.
			if (other.box.left >= current.box.right) {
				break;
			}
			const top = Math.max(current.box.top, other.box.top);
			const bottom = Math.min(current.box.bottom, other.box.bottom);
			if (top >= bottom) {
				continue;
			}
			const left = Math.max(current.box.left, other.box.left);
			const right = Math.min(current.box.right, other.box.right);
			overlaps.push({
				ids: [current.id, other.id],
				overlap: { x: left, y: top, width: right - left, height: bottom - top },
				covers: resolveCovers(current.box, other.box),
			});
		}
	}

	return overlaps.sort(
		(a, b) =>
			b.overlap.width * b.overlap.height - a.overlap.width * a.overlap.height,
	);
};
