import { type RefObject, useEffect } from "react";

import type { CanvasGestureHandling } from "../CanvasGestureHandling";

/**
 * Selector of the elements whose touches belong to the canvas under cooperative
 * gesture handling. Menus are left out on purpose: they are HTML, where the
 * `touch-action: none` claim in CanvasStyled is honored, and cancelling their
 * touchstart would swallow the native click their buttons run on.
 */
const CANVAS_OWNED_TOUCH_SELECTOR =
	'[data-kind="object"], [data-kind="connector"], [data-kind="control"]';

/**
 * Keeps a touch that starts on a shape with the canvas under
 * `gestureHandling="cooperative"`.
 *
 * The CSS route (`touch-action: none` on the shape elements, see CanvasStyled)
 * is the spec-correct claim, but Chromium and WebKit ignore `touch-action` on
 * inner SVG elements — the computed style is there and the browser still takes
 * the touch for a page scroll, killing the drag with a pointercancel halfway.
 * Cancelling the touchstart is what actually works: it stops the native scroll
 * for that touch alone, while pointer events keep flowing to the recognizer.
 * Background touches are untouched and scroll the page as cooperative promises.
 *
 * @param rootRef - The canvas root the recognizer's handlers are attached to;
 *   the listener is registered non-passively on it (element listeners are not
 *   passive by default, but the intent is spelled out)
 * @param gestureHandling - Current mode; the listener exists only under
 *   `"cooperative"` (greedy roots carry `touch-action: none` wholesale)
 */
export function useCooperativeTouchClaim(
	rootRef: RefObject<HTMLElement | null>,
	gestureHandling: CanvasGestureHandling,
): void {
	useEffect(() => {
		const root = rootRef.current;
		if (gestureHandling !== "cooperative" || root === null) {
			return;
		}
		const claimShapeTouch = (event: TouchEvent) => {
			const target = event.target;
			if (
				target instanceof Element &&
				target.closest(CANVAS_OWNED_TOUCH_SELECTOR) !== null
			) {
				event.preventDefault();
			}
		};
		root.addEventListener("touchstart", claimShapeTouch, { passive: false });
		return () => root.removeEventListener("touchstart", claimShapeTouch);
	}, [rootRef, gestureHandling]);
}
