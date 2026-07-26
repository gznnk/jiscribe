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
 *   2. Within the time threshold (DOUBLE_CLICK_THRESHOLD)
 *   3. Within the screen distance threshold (DOUBLE_CLICK_DISTANCE_THRESHOLD)
 *
 * Target identity is deliberately NOT compared, matching the OS/browser
 * convention (time + position only). Two clicks a human lands within the
 * distance threshold and the time threshold are one double click even when
 * the second one hits a different element — typically a control the first
 * click made appear (e.g. a connector's waypoint-insert handle over the
 * default label position). The emitted doubleClick targets the second
 * click's element; what the pair means is decided by its handler.
 *
 * Never treat it as a doubleClick while previous is null (no baseline
 * recorded). Distance is compared squared, as in the DRAG_THRESHOLD check,
 * to avoid sqrt.
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
		current.time - previous.time < DOUBLE_CLICK_THRESHOLD &&
		clientDistanceSquared < DOUBLE_CLICK_DISTANCE_THRESHOLD
	);
};
