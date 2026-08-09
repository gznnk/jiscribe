import {
	DOUBLE_CLICK_DISTANCE_THRESHOLD,
	DOUBLE_CLICK_DISTANCE_THRESHOLD_TOUCH,
	DOUBLE_CLICK_THRESHOLD,
} from "../GestureRecognizerConstants";
import type { ClickSnapshot } from "../GestureRecognizerTypes";

/**
 * Determine whether the current click satisfies all conditions to count as a doubleClick.
 *
 * Conditions:
 *   1. A prior single click is recorded (previous !== null)
 *   2. Both clicks came from the primary button (0); touch and pen taps report
 *      0 as well, so double-tap keeps working
 *   3. Within the time threshold (DOUBLE_CLICK_THRESHOLD)
 *   4. Within the screen distance threshold — per pointer type of the current
 *      click: DOUBLE_CLICK_DISTANCE_THRESHOLD_TOUCH for touch (tap jitter, cf.
 *      DRAG_THRESHOLD_TOUCH), DOUBLE_CLICK_DISTANCE_THRESHOLD otherwise
 *
 * Every gesture a doubleClick stands for (text editing, connector label,
 * waypoint insert) is a primary-button interaction, so the other buttons never
 * pair. Without that restriction the ordinary "select a shape, then right-click
 * it" sequence lands inside both thresholds and fires doubleClick for the right
 * press: the context menu, which only opens on `click`, silently never appears,
 * and the pair also reaches the primary-button doubleClick handlers.
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
	const distanceThreshold =
		current.pointerType === "touch"
			? DOUBLE_CLICK_DISTANCE_THRESHOLD_TOUCH
			: DOUBLE_CLICK_DISTANCE_THRESHOLD;

	return (
		previous.button === 0 &&
		current.button === 0 &&
		current.time - previous.time < DOUBLE_CLICK_THRESHOLD &&
		clientDistanceSquared < distanceThreshold
	);
};
