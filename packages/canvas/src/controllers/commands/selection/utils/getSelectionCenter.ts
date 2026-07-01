import { calcPolyBoundingBox, isTransformedFrame } from "@workspace/geometry";

import { isPoly } from "../../../../schemas/objects/types/Poly";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../../CanvasTypes";

/**
 * Returns the current center coordinates of the selected objects.
 * Multiple selection: uses the cx/cy of multiSelectGroup.
 * Single selection: computes cx/cy or the bounding box center depending on the object type.
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

	if (obj.type === "group") {
		const g = obj as GroupState;
		return { cx: g.cx, cy: g.cy };
	}
	if (isTransformedFrame(obj)) {
		return { cx: obj.cx, cy: obj.cy };
	}
	if (isPoly(obj)) {
		const bbox = calcPolyBoundingBox(obj.points);
		if (!bbox) {
			return null;
		}
		return {
			cx: (bbox.left + bbox.right) / 2,
			cy: (bbox.top + bbox.bottom) / 2,
		};
	}

	return null;
}
