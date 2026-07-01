import { findGestureElement } from "./findGestureElement";

/**
 * Determines whether pointer capture should be skipped to preserve the browser's
 * native pointer behavior.
 *
 * For elements with data-gesture="native-pointer" (such as sliders), capturing
 * would break the native drag behavior, so capture is skipped.
 *
 * @param target - The event target
 * @returns true if pointer capture should be skipped
 */
export const shouldSkipPointerCapture = (
	target: EventTarget | null,
): boolean => {
	return findGestureElement(target, "native-pointer") !== null;
};
