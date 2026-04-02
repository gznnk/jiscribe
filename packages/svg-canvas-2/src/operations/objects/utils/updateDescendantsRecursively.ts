import { isFrame, roundToDecimal } from "@workspace/geometry";

import { PRECISION } from "../../../constants/precision";
import { isPoly } from "../../../schemas/objects/types/Poly";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/GroupState";

/**
 * Recursively updates the position of all descendant objects by a delta.
 * Used when dragging a group - all children (and grandchildren) need to move.
 *
 * @param childIds - IDs of direct children to update
 * @param originalObjects - Original objects from eventStartState
 * @param updatedObjects - Target object to write updates to (mutated)
 * @param delta - Movement delta {x, y}
 */
export function updateDescendantsRecursively(
	childIds: string[],
	originalObjects: Record<string, ObjectState>,
	updatedObjects: Record<string, ObjectState>,
	delta: { x: number; y: number },
): void {
	for (const childId of childIds) {
		const child = originalObjects[childId];
		if (!child) continue;

		// Frame型: cx, cy を更新
		if (isFrame(child)) {
			updatedObjects[childId] = {
				...child,
				cx: roundToDecimal(child.cx + delta.x, PRECISION.COORDINATE),
				cy: roundToDecimal(child.cy + delta.y, PRECISION.COORDINATE),
			} as ObjectState;
		}

		// Poly型: 全ポイントを更新
		if (isPoly(child)) {
			updatedObjects[childId] = {
				...child,
				points: child.points.map((p) => ({
					x: roundToDecimal(p.x + delta.x, PRECISION.COORDINATE),
					y: roundToDecimal(p.y + delta.y, PRECISION.COORDINATE),
				})),
			} as ObjectState;
		}

		// 子がグループの場合: 再帰的に処理
		if (child.type === "group") {
			const childGroup = child as GroupState;

			// Groups don't have position (geometry: "none")
			// Just recursively update their children
			updateDescendantsRecursively(
				childGroup.childIds,
				originalObjects,
				updatedObjects,
				delta,
			);
		}
	}
}
