import type { BoundingBox } from "@workspace/geometry";

import { calcObjectBoundingBox } from "./calcObjectBoundingBox";
import type { ObjectVisualBoundsRegistry } from "../../presentations/objects/registry/ObjectVisualBoundsRegistry";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isGroupState } from "../../states/objects/primitives/group/GroupState";

/**
 * Pure function that computes the world-coordinate bounding box of all
 * content (every object except groups).
 *
 * The single source of the "whole content extent": shared by
 * `calcFitViewport` (zoom-to-fit / thumbnail) and the image-export viewBox.
 * Returns `null` when there is no extent (no objects / all degenerate).
 *
 * @param objects - The object map; groups are skipped because the loop already
 *   visits their children directly
 * @param visualBounds - Per-canvas ObjectVisualBoundsRegistry. Both consumers of
 *   this extent frame the drawing, so they pass it; omitting it crops whatever a
 *   shape draws outside its geometry box
 */
export const calcContentBounds = (
	objects: Record<string, ObjectState>,
	visualBounds?: Pick<ObjectVisualBoundsRegistry, "get"> | null,
): BoundingBox | null => {
	let minX = Infinity,
		maxX = -Infinity,
		minY = Infinity,
		maxY = -Infinity;
	let hasValidObject = false;

	for (const obj of Object.values(objects)) {
		// Skip groups: their children are iterated directly by this loop,
		// so recursing into them would only duplicate work.
		if (!obj || isGroupState(obj)) {
			continue;
		}

		const bbox = calcObjectBoundingBox(obj, objects, visualBounds);
		if (!bbox) {
			continue;
		}

		minX = Math.min(minX, bbox.left);
		maxX = Math.max(maxX, bbox.right);
		minY = Math.min(minY, bbox.top);
		maxY = Math.max(maxY, bbox.bottom);
		hasValidObject = true;
	}

	if (!hasValidObject) {
		return null;
	}

	return { left: minX, top: minY, right: maxX, bottom: maxY };
};
