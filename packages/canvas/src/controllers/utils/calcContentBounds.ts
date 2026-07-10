import { calcObjectBoundingBox } from "./calcObjectBoundingBox";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isGroupState } from "../../states/objects/primitives/group/GroupState";

export type ContentBounds = {
	left: number;
	top: number;
	right: number;
	bottom: number;
};

/**
 * Pure function that computes the world-coordinate bounding box of all
 * content (every object except groups).
 *
 * The single source of the "whole content extent": shared by
 * `calcFitViewport` (zoom-to-fit / thumbnail) and the image-export viewBox.
 * Returns `null` when there is no extent (no objects / all degenerate).
 */
export const calcContentBounds = (
	objects: Record<string, ObjectState>,
): ContentBounds | null => {
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

		const bbox = calcObjectBoundingBox(obj, objects);
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
