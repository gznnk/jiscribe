import type { BoundingBox } from "@jiscribe/geometry";

/**
 * Collects the IDs of objects fully contained within the area-selection rectangle.
 *
 * Operates over a precomputed "id → root-level bbox" map (see {@link buildObjectBBoxes}),
 * built once at dragStart, so the marquee drag hot path is pure O(N) containment testing
 * with no per-frame bbox recomputation. The map already excludes connectors and objects
 * without a valid extent.
 */
export function collectIdsInArea(
	bboxes: Record<string, BoundingBox>,
	areaMinX: number,
	areaMinY: number,
	areaMaxX: number,
	areaMaxY: number,
): string[] {
	const result: string[] = [];

	for (const [id, bbox] of Object.entries(bboxes)) {
		// Check whether it is fully contained
		if (
			bbox.left >= areaMinX &&
			bbox.right <= areaMaxX &&
			bbox.top >= areaMinY &&
			bbox.bottom <= areaMaxY
		) {
			result.push(id);
		}
	}

	return result;
}
