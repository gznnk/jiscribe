import type { Dimensions } from "@workspace/geometry";
import { type Dispatch, type RefObject, useEffect, useRef } from "react";

import type { CanvasAction } from "../reducer/CanvasActions";

/**
 * Hook that observes size changes of a container element and dispatches a
 * CONTAINER_RESIZE action whenever the size changes.
 *
 * @param containerRef - Reference to the container element to observe
 * @param dispatch - The Canvas reducer's dispatch
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 * const [state, dispatch] = useCanvasReducer(canvasDoc);
 *
 * useContainerResize(containerRef, dispatch);
 * ```
 */
export function useContainerResize(
	containerRef: RefObject<HTMLDivElement | null>,
	dispatch: Dispatch<CanvasAction>,
): void {
	const lastDimensions = useRef<Dimensions | null>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}

		const updateDimensions = (width: number, height: number) => {
			// Only dispatch when the value has actually changed
			if (
				!lastDimensions.current ||
				lastDimensions.current.width !== width ||
				lastDimensions.current.height !== height
			) {
				const dimensions = { width, height };
				lastDimensions.current = dimensions;
				dispatch({ type: "CONTAINER_RESIZE", dimensions });
			}
		};

		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				updateDimensions(width, height);
			}
		});

		resizeObserver.observe(container);

		// Set the initial size
		const rect = container.getBoundingClientRect();
		updateDimensions(rect.width, rect.height);

		return () => {
			resizeObserver.disconnect();
		};
	}, [containerRef, dispatch]);
}
