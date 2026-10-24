import { unionBoundingBoxes } from "@jiscribe/geometry";
import type { BoundingBox } from "@jiscribe/geometry";

import { buildSelectedIdsWithDescendants } from "./buildSelectedIdsWithDescendants";
import { calcObjectBoundingBox } from "./calcObjectBoundingBox";
import type { VisualExtentRegistries } from "./VisualExtentRegistries";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isGroupState } from "../../states/objects/primitives/group/GroupState";

/**
 * Pure function that computes the world-coordinate bounding box of the given
 * selection (a selected group contributes through its children).
 *
 * The selection counterpart of `calcContentBounds`: shared by
 * `calcSelectionFitViewport` (zoom-to-selection) and the imperative viewport
 * handle. Returns `null` when nothing in the selection has an extent (empty
 * selection, unknown ids, all degenerate).
 *
 * @param selectedIds - Ids to measure; ids absent from `objects` are skipped
 * @param objects - Flat object map, used to resolve group children and geometry
 * @param visualExtentRegistries - Per-canvas registries measuring what is drawn
 *   (see calcObjectBoundingBox): what a shape draws outside its geometry box and a
 *   connector route leaving its owners are part of the extent
 */
export const calcSelectionBounds = (
	selectedIds: readonly string[],
	objects: Record<string, ObjectState>,
	visualExtentRegistries: VisualExtentRegistries,
): BoundingBox | null => {
	const targetIds = buildSelectedIdsWithDescendants(selectedIds, objects);

	const bboxes: (BoundingBox | null)[] = [];
	for (const id of targetIds) {
		const obj = objects[id];
		// Skip groups: targetIds already contains their descendants,
		// so recursing into them would only duplicate work.
		if (!obj || isGroupState(obj)) {
			continue;
		}

		bboxes.push(calcObjectBoundingBox(obj, objects, visualExtentRegistries));
	}
	return unionBoundingBoxes(bboxes);
};
