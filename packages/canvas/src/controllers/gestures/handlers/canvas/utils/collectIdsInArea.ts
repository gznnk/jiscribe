import {
	calcBoundingBox,
	calcPolyBoundingBox,
	isTransformedFrame,
	type BoundingBox,
} from "@workspace/geometry";

import { isPoly } from "../../../../../schemas/objects/types/Poly";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";

/**
 * Collects the IDs of objects fully contained within the area-selection rectangle.
 * Traverses all objects (including group children).
 */
export function collectIdsInArea(
	objects: Record<string, ObjectState>,
	areaMinX: number,
	areaMinY: number,
	areaMaxX: number,
	areaMaxY: number,
): string[] {
	const result: string[] = [];

	for (const obj of Object.values(objects)) {
		if (!obj) {
			continue;
		}

		let bbox: BoundingBox | null;

		if (isTransformedFrame(obj)) {
			// Frame-based objects (Rect, Ellipse, Group, Sticky)
			bbox = calcBoundingBox(obj);
		} else if (isPoly(obj) && obj.type !== "connector") {
			// Poly-based objects (Polyline, Polygon)
			bbox = calcPolyBoundingBox(obj.points);
		} else {
			// Skip unsupported types
			continue;
		}

		// null check (e.g. empty Poly)
		if (!bbox) {
			continue;
		}

		// Check whether it is fully contained
		if (
			bbox.left >= areaMinX &&
			bbox.right <= areaMaxX &&
			bbox.top >= areaMinY &&
			bbox.bottom <= areaMaxY
		) {
			result.push(obj.id);
		}
	}

	return result;
}
