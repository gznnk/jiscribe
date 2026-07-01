import { findGestureElement } from "./findGestureElement";

/**
 * Determines whether a wheel event should be left to the browser's native scrolling.
 *
 * A wheel that occurs inside an element with data-gesture="native-wheel" is treated as
 * that element's own native scroll rather than a canvas scroll, but only when the
 * element is scrollable (its content overflows).
 * When Ctrl is held, it is always handled by the canvas since that is a zoom gesture.
 *
 * @param target - The wheel event target
 * @param ctrlKey - Whether the Ctrl key is held
 * @returns true if native scrolling should take over
 */
export const shouldUseNativeWheel = (
	target: EventTarget | null,
	ctrlKey: boolean,
): boolean => {
	if (ctrlKey) {
		return false;
	}

	const scrollableEl = findGestureElement(target, "native-wheel");
	if (!scrollableEl) {
		return false;
	}

	return scrollableEl.scrollHeight > scrollableEl.clientHeight;
};
