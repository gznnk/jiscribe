import type { BoundingBox } from "../types";

/**
 * Smallest axis-aligned box enclosing every given box.
 *
 * @param boxes - Boxes in one shared coordinate space, in any order; `null` and
 *   `undefined` entries are skipped, so a per-item lookup can be passed as is. A
 *   `NaN` edge propagates to that edge of the result
 * @returns A new box (never one of the inputs), or null when `boxes` holds no
 *   box at all (empty, or only `null` / `undefined`)
 */
export function unionBoundingBoxes(
	boxes: Iterable<BoundingBox | null | undefined>,
): BoundingBox | null {
	let left = Infinity;
	let top = Infinity;
	let right = -Infinity;
	let bottom = -Infinity;
	let hasBox = false;

	for (const box of boxes) {
		if (!box) {
			continue;
		}
		// Math.min / Math.max rather than comparisons so a NaN edge is not dropped.
		left = Math.min(left, box.left);
		top = Math.min(top, box.top);
		right = Math.max(right, box.right);
		bottom = Math.max(bottom, box.bottom);
		hasBox = true;
	}

	if (!hasBox) {
		return null;
	}

	return { left, top, right, bottom };
}
