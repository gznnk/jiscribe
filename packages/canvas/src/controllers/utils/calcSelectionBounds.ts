import type { BoundingBox } from "@workspace/geometry";

import { buildSelectedIdsWithDescendants } from "./buildSelectedIdsWithDescendants";
import { calcObjectBoundingBox } from "./calcObjectBoundingBox";
import type { ObjectVisualBoundsRegistry } from "../../presentations/objects/registry/ObjectVisualBoundsRegistry";
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
 * @param visualBounds - Per-canvas ObjectVisualBoundsRegistry; omitting it
 *   measures the geometry boxes and crops what a shape draws outside them
 */
export const calcSelectionBounds = (
	selectedIds: readonly string[],
	objects: Record<string, ObjectState>,
	visualBounds?: Pick<ObjectVisualBoundsRegistry, "get"> | null,
): BoundingBox | null => {
	const targetIds = buildSelectedIdsWithDescendants(selectedIds, objects);

	let minX = Infinity,
		maxX = -Infinity,
		minY = Infinity,
		maxY = -Infinity;
	let hasValidObject = false;

	for (const id of targetIds) {
		const obj = objects[id];
		// Skip groups: targetIds already contains their descendants,
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
