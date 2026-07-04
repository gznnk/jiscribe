import type { CanvasControllerState } from "../../../CanvasTypes";
import { calcObjectBoundingBox } from "../../../utils/calcObjectBoundingBox";

/**
 * Returns the current center coordinates of the selected objects.
 * Multiple selection: uses the cx/cy of multiSelectGroup.
 * Single selection: uses the center of the object's bounding box.
 */
export function getSelectionCenter(
	state: CanvasControllerState,
	ids: string[],
): { cx: number; cy: number } | null {
	if (ids.length === 0) {
		return null;
	}

	if (ids.length > 1) {
		const msg = state.multiSelectGroup;
		return msg ? { cx: msg.cx, cy: msg.cy } : null;
	}

	const obj = state.objects[ids[0]];
	if (!obj) {
		return null;
	}

	const bbox = calcObjectBoundingBox(obj, state.objects);
	if (!bbox) {
		return null;
	}

	return {
		cx: (bbox.left + bbox.right) / 2,
		cy: (bbox.top + bbox.bottom) / 2,
	};
}
