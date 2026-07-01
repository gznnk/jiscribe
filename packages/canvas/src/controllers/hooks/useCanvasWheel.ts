import { type RefObject, useEffect } from "react";

import { shouldUseNativeWheel } from "../gestures/recognizer/utils/shouldUseNativeWheel";

/**
 * Hook that listens for wheel events on the canvas container element and runs a callback.
 *
 * The listener is scoped to the container element rather than `document`, so that:
 * - Wheel events that occur outside the canvas (the host page's side panels,
 *   toolbars, body, etc.) are not hijacked and keep their native scrolling.
 * - Multiple Canvases can be placed on the same page, each handling only the wheel
 *   events within its own area (no need to separately track an "active Canvas").
 *
 * Over scrollable elements marked with data-gesture="native-wheel" (such as a textarea
 * being edited), native scrolling is left in place and preventDefault is not called.
 * When Ctrl is held, the event is always handled by the canvas as a zoom operation.
 *
 * @param containerRef - Reference to the canvas container element
 * @param onWheel - Callback invoked when a wheel event occurs
 */
export function useCanvasWheel(
	containerRef: RefObject<HTMLElement | null>,
	onWheel: (e: WheelEvent) => void,
): void {
	useEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}

		const onContainerWheel = (e: WheelEvent) => {
			// Over a scrollable data-gesture="native-wheel" element (such as a textarea
			// being edited), leave native scrolling in place and skip canvas scrolling
			if (shouldUseNativeWheel(e.target, e.ctrlKey)) {
				return;
			}
			e.preventDefault();
			onWheel(e);
		};

		// capture: true captures wheel events on any element within the container
		// before its descendants. passive: false is required to call preventDefault.
		container.addEventListener("wheel", onContainerWheel, {
			passive: false,
			capture: true,
		});

		return () => {
			container.removeEventListener("wheel", onContainerWheel, {
				capture: true,
			});
		};
	}, [containerRef, onWheel]);
}
