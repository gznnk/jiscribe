import {
	type Dispatch,
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
} from "react";

import type { CanvasAction } from "../reducer/CanvasActions";

/**
 * The container's last measured box: its size, plus the position of its left
 * edge inside its offset parent. `left` is null while the element is not laid
 * out (no offset parent), when the two measurements cannot be compared.
 */
type MeasuredLayout = {
	width: number;
	height: number;
	left: number | null;
};

/**
 * Left edge of the container inside its offset parent (CanvasRoot, the nearest
 * positioned ancestor). Deliberately not a viewport-relative rectangle: only a
 * move within the canvas layout, such as the shape library sidebar taking space
 * beside the viewport, should count as a shift — scrolling the host page or
 * resizing the window from the left moves the whole canvas with its contents.
 */
function measureLeft(container: HTMLElement): number | null {
	return container.offsetParent === null ? null : container.offsetLeft;
}

/**
 * Hook that keeps the reducer's viewport in step with the container element:
 * dispatches a CONTAINER_RESIZE action whenever its size or the position of its
 * left edge changes.
 *
 * Two observers feed it. A ResizeObserver catches every change, but reports it
 * only after the frame that caused it has painted — fine for a window resize,
 * a visible one-frame jump when the change is the canvas's own chrome moving
 * the viewport (the shape library sidebar taking its space). So the container
 * is also measured in a layout effect keyed on `layoutKey`: that runs after the
 * commit that changed the chrome and before the browser paints, and React
 * flushes the dispatch synchronously, so the compensated camera is what gets
 * painted.
 *
 * @param containerRef - Reference to the container element to observe
 * @param dispatch - The Canvas reducer's dispatch
 * @param layoutKey - A value whose change means React itself re-laid out the
 *   container (the sidebar's open flag). Compared by identity; the container is
 *   re-measured synchronously after every commit in which it differs.
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 * const [state, dispatch] = useCanvasReducer(canvasDoc);
 *
 * useContainerResize(containerRef, dispatch, state.stencilLibraryPanel.isOpen);
 * ```
 */
export function useContainerResize(
	containerRef: RefObject<HTMLDivElement | null>,
	dispatch: Dispatch<CanvasAction>,
	layoutKey: unknown,
): void {
	const lastLayout = useRef<MeasuredLayout | null>(null);

	// Dispatches only when a measured value has actually changed, so the two
	// observers reporting the same layout cost one action, not two.
	const reportLayout = useCallback(
		(container: HTMLElement, width: number, height: number) => {
			const left = measureLeft(container);
			const previousLayout = lastLayout.current;
			const leftEdgeShift =
				previousLayout !== null && previousLayout.left !== null && left !== null
					? left - previousLayout.left
					: 0;

			if (
				previousLayout !== null &&
				previousLayout.width === width &&
				previousLayout.height === height &&
				leftEdgeShift === 0
			) {
				return;
			}

			lastLayout.current = { width, height, left };
			dispatch({
				type: "CONTAINER_RESIZE",
				dimensions: { width, height },
				leftEdgeShift,
			});
		},
		[dispatch],
	);

	// Before paint: the initial size at mount, and every layout change React
	// itself made (see layoutKey).
	useLayoutEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}
		const rect = container.getBoundingClientRect();
		reportLayout(container, rect.width, rect.height);
	}, [containerRef, reportLayout, layoutKey]);

	// After paint: everything else (window resizes, host layout changes).
	useEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}

		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				reportLayout(container, width, height);
			}
		});

		resizeObserver.observe(container);

		return () => {
			resizeObserver.disconnect();
		};
	}, [containerRef, reportLayout]);
}
