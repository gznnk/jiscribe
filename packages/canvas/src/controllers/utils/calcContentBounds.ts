import { unionBoundingBoxes } from "@jiscribe/geometry";
import type { BoundingBox } from "@jiscribe/geometry";

import { calcObjectBoundingBox } from "./calcObjectBoundingBox";
import type { VisualExtentRegistries } from "./VisualExtentRegistries";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isGroupState } from "../../states/objects/primitives/group/GroupState";

/**
 * Pure function that computes the world-coordinate bounding box of all
 * content (every object except groups).
 *
 * The single source of the "whole content extent": shared by
 * `calcFitViewport` (zoom-to-fit) and the image-export viewBox.
 * Returns `null` when there is no extent (no objects / all degenerate).
 *
 * @param objects - The object map; groups are skipped because the loop already
 *   visits their children directly
 * @param visualExtentRegistries - Per-canvas registries measuring what is drawn
 *   (see calcObjectBoundingBox): what a shape draws outside its geometry box and a
 *   connector route leaving its owners are part of the extent. Required because
 *   every consumer of this extent frames the drawing
 */
export const calcContentBounds = (
	objects: Record<string, ObjectState>,
	visualExtentRegistries: VisualExtentRegistries,
): BoundingBox | null => {
	const bboxes: (BoundingBox | null)[] = [];
	for (const obj of Object.values(objects)) {
		// Skip groups: their children are iterated directly by this loop,
		// so recursing into them would only duplicate work.
		if (!obj || isGroupState(obj)) {
			continue;
		}

		bboxes.push(calcObjectBoundingBox(obj, objects, visualExtentRegistries));
	}
	return unionBoundingBoxes(bboxes);
};
