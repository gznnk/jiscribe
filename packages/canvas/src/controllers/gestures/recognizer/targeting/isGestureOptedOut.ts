import { findGestureElement } from "./findGestureElement";

/**
 * Determines whether the target element is opted out of the gesture system
 * (inside data-gesture="none").
 *
 * When true, pointerdown does not start a gesture and contextmenu is left to
 * native behavior. Applied to elements that are self-contained within React
 * event handlers, such as the editing surface during text editing or input
 * fields inside a menu.
 *
 * @param target - The event target
 * @returns true if opted out of the gesture system
 */
export const isGestureOptedOut = (target: EventTarget | null): boolean => {
	return findGestureElement(target, "none") !== null;
};
