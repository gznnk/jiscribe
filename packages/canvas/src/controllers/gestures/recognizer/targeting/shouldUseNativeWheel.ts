import { findGestureElement } from "./findGestureElement";

/**
 * Determines whether a wheel event should be left to the browser's native scrolling.
 *
 * A wheel that occurs inside an element with data-gesture="native-wheel" is treated as
 * that element's own native scroll rather than a canvas scroll, but only when the
 * element is scrollable (its content overflows).
 * When Ctrl is held, it is always handled by the canvas since that is a zoom gesture.
 *
 * Inside an element with data-gesture="native-wheel-always" the wheel is never
 * the canvas's, scrollable or not and Ctrl-held or not: such chrome floats inside
 * the viewport but takes the wheel as the sidebars do (useBlockBrowserZoom cancels the Ctrl one).
 *
 * @param target - The wheel event target
 * @param ctrlKey - Whether the Ctrl key is held
 * @returns true if the canvas should leave the wheel alone
 */
export const shouldUseNativeWheel = (
	target: EventTarget | null,
	ctrlKey: boolean,
): boolean => {
	if (findGestureElement(target, "native-wheel-always")) {
		return true;
	}
	if (ctrlKey) {
		return false;
	}

	const scrollableEl = findGestureElement(target, "native-wheel");
	if (!scrollableEl) {
		return false;
	}

	return scrollableEl.scrollHeight > scrollableEl.clientHeight;
};
