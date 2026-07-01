import {
	DOUBLE_CLICK_DISTANCE_THRESHOLD,
	DOUBLE_CLICK_THRESHOLD,
} from "../GestureRecognizerConstants";
import type { ClickSnapshot } from "../GestureRecognizerTypes";

/**
 * Determine whether the current click satisfies all conditions to count as a doubleClick.
 *
 * Conditions:
 *   1. A prior single click is recorded (previous !== null)
 *   2. Same target (matching targetId; the background matches as both are undefined)
 *   3. Within the time threshold (DOUBLE_CLICK_THRESHOLD)
 *   4. Within the screen distance threshold (DOUBLE_CLICK_DISTANCE_THRESHOLD)
 *
 * Never treat it as a doubleClick while previous is null (no baseline recorded). Because the
 * background always has an undefined targetId that matches, distinguishing separate clicks
 * by position is handled by the distance check. Distance is compared squared, as in the
 * DRAG_THRESHOLD check, to avoid sqrt.
 *
 * @param previous - The prior single click, or null if none recorded
 * @param current - The current click
 * @returns true if it should be treated as a doubleClick
 */
export const isDoubleClick = (
	previous: ClickSnapshot | null,
	current: ClickSnapshot,
): boolean => {
	if (previous === null) {
		return false;
	}

	const clientDistanceSquared =
		(current.clientPos.x - previous.clientPos.x) ** 2 +
		(current.clientPos.y - previous.clientPos.y) ** 2;

	return (
		previous.targetId === current.targetId &&
		current.time - previous.time < DOUBLE_CLICK_THRESHOLD &&
		clientDistanceSquared < DOUBLE_CLICK_DISTANCE_THRESHOLD
	);
};
