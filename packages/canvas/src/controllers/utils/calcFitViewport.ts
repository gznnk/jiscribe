import { calcObjectBoundingBox } from "./calcObjectBoundingBox";
import { calcViewportForBounds } from "./calcViewportForBounds";
import type { Viewport } from "../../states/canvas/Viewport";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isGroupState } from "../../states/objects/primitives/group/GroupState";

type FitOptions = {
	/** Viewport width in screen px. */
	width: number;
	/** Viewport height in screen px. */
	height: number;
	/** Empty margin (screen px) kept around the content on every side. */
	padding?: number;
};

/**
 * Pure function that computes a Viewport fitting all content (every object
 * except groups).
 *
 * Shared by `ZoomToFitCommand` (Ctrl+0) and the read-only `CanvasThumbnail` so
 * the fit behavior does not drift. Returns `null` when there is no extent to
 * fit (no objects / all degenerate).
 */
export const calcFitViewport = (
	objects: Record<string, ObjectState>,
	{ width, height, padding = 48 }: FitOptions,
): Viewport | null => {
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

	return calcViewportForBounds(
		{ left: minX, top: minY, right: maxX, bottom: maxY },
		{ width, height, padding },
	);
};
