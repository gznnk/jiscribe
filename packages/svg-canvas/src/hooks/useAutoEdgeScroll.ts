import type { Point } from "@workspace/geometry";
import { useCallback, useRef } from "react";
import type { RefObject } from "react";

import { AUTO_SCROLL_INTERVAL_MS } from "../constants/core/Constants";
import type { SvgViewport } from "../types/core/SvgViewport";
import { calculateScrollDelta } from "../utils/scroll/calculateScrollDelta";
import { detectEdgeProximity } from "../utils/scroll/detectEdgeProximity";

/**
 * Type for edge scroll state.
 */
export type EdgeScrollState = {
	cursorPos: Point;
	delta: Point;
};

/**
 * Type for the function to handle edge scrolling.
 */
export type HandleEdgeScrollArgs = EdgeScrollState & {
	minX: number;
	minY: number;
};

/**
 * Source type that can provide a viewport snapshot or a ref with one.
 */
type ViewportSource = SvgViewport | RefObject<SvgViewport | null>;

/**
 * Type guard to check if the source is a ref object.
 * @param source - The source to check.
 * @returns True if the source is a ref object, false otherwise.
 */
const isViewportRef = (
	source: ViewportSource,
): source is RefObject<SvgViewport | null> => {
	return source !== null && typeof source === "object" && "current" in source;
};

/**
 * Resolve the initial viewport from the source.
 * @param source - The viewport source, either a direct viewport or a ref.
 * @returns The resolved SvgViewport.
 */
const resolveInitialViewport = (source: ViewportSource): SvgViewport => {
	if (isViewportRef(source)) {
		return (
			source.current ?? {
				minX: 0,
				minY: 0,
				containerWidth: 0,
				containerHeight: 0,
				zoom: 1,
			}
		);
	}
	return source;
};

/**
 * Custom hook to handle auto edge scrolling in the SVG canvas.
 * @param viewportSource - The current SVG viewport or a ref that can provide it.
 * @param handleEdgeScroll - Function to handle edge scrolling with new state.
 */
export const useAutoEdgeScroll = (
	viewportSource: ViewportSource,
	handleEdgeScroll: (state: HandleEdgeScrollArgs) => void,
) => {
	// Internal state for edge scrolling
	const scrollIntervalRef = useRef<number | null>(null);
	const isScrollingRef = useRef(false);

	// Internal state for edge scrolling
	const edgeScrollStateRef = useRef<EdgeScrollState>({
		cursorPos: { x: 0, y: 0 },
		delta: { x: 0, y: 0 },
	});

	const latestViewportRef = useRef<SvgViewport>(
		resolveInitialViewport(viewportSource),
	);
	latestViewportRef.current = resolveInitialViewport(viewportSource);

	const resolveViewport = () => {
		if (isViewportRef(viewportSource)) {
			const resolved = viewportSource.current ?? latestViewportRef.current;
			latestViewportRef.current = resolved;
			return resolved;
		}
		latestViewportRef.current = viewportSource;
		return viewportSource;
	};

	// Use ref to hold referenced values to avoid frequent handler generation
	const refBusVal = {
		resolveViewport,
		handleEdgeScroll,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	/**
	 * Clear the edge scroll interval if it exists
	 */
	const clearEdgeScroll = useCallback(() => {
		if (scrollIntervalRef.current) {
			clearInterval(scrollIntervalRef.current);
			scrollIntervalRef.current = null;
			isScrollingRef.current = false;
		}
	}, []);

	/**
	 * Start edge scrolling with calculated delta values
	 */
	const startEdgeScroll = useCallback(() => {
		// Mark scrolling as active
		isScrollingRef.current = true;

		// Execute scroll processing immediately
		const executeScroll = () => {
			// Bypass references to avoid function creation in every render.
			const { resolveViewport, handleEdgeScroll } = refBus.current;
			const viewport = resolveViewport();

			// Auto edge scroll if the cursor is near the edges.
			const zoom = viewport.zoom;
			const minX = viewport.minX;
			const minY = viewport.minY;

			const { cursorPos, delta } = edgeScrollStateRef.current;
			const deltaX = delta.x / zoom;
			const deltaY = delta.y / zoom;

			const newCursorPos = {
				x: cursorPos.x + deltaX,
				y: cursorPos.y + deltaY,
			};

			// Update edgeScrollStateRef
			edgeScrollStateRef.current = {
				cursorPos: newCursorPos,
				delta,
			};

			// Calculate new scroll positions
			const newMinX = minX + delta.x;
			const newMinY = minY + delta.y;

			handleEdgeScroll({
				cursorPos: newCursorPos,
				delta: { x: deltaX, y: deltaY },
				minX: newMinX,
				minY: newMinY,
			});
		};

		// Execute immediately
		executeScroll();

		// Continue with interval
		scrollIntervalRef.current = window.setInterval(
			executeScroll,
			AUTO_SCROLL_INTERVAL_MS,
		);
	}, []);

	/**
	 * Auto edge scroll handler
	 * @param cursorPos - The current cursor position
	 * @param options - Optional drag options containing dragPoint and dragPositioningFunction
	 * @return {boolean} - Returns true if auto edge scrolling was triggered, false otherwise.
	 */
	const autoEdgeScroll = useCallback(
		(
			cursorPos: Point,
			options?: {
				dragPoint?: Point;
				dragPositioningFunction?: (x: number, y: number) => Point;
			},
		): boolean => {
			// Bypass references to avoid function creation in every render.
			const { resolveViewport } = refBus.current;
			const viewport = resolveViewport();

			// Auto edge scroll if the cursor is near the edges.
			const { x: cursorX, y: cursorY } = cursorPos;

			// Check edge proximity using shared function
			const edgeProximity = detectEdgeProximity(viewport, cursorX, cursorY);

			if (!edgeProximity.isNearEdge) {
				// Cursor moved away from all edges, stop scrolling
				clearEdgeScroll();
				return false;
			}

			// Calculate scroll delta and update edge scroll state atomically
			let { deltaX, deltaY } = calculateScrollDelta(
				edgeProximity.horizontal,
				edgeProximity.vertical,
			);

			// Apply dragPositioningFunction if provided
			const { dragPoint, dragPositioningFunction } = options || {};
			if (dragPoint && dragPositioningFunction) {
				// Calculate target position with original delta applied to dragPoint
				const targetX = dragPoint.x + deltaX;
				const targetY = dragPoint.y + deltaY;

				// Apply positioning function to get modified target position
				const modifiedTarget = dragPositioningFunction(targetX, targetY);

				// Calculate new delta as difference between current dragPoint and modified target
				deltaX = modifiedTarget.x - dragPoint.x;
				deltaY = modifiedTarget.y - dragPoint.y;
			}

			// Update edgeScrollStateRef
			edgeScrollStateRef.current = {
				cursorPos,
				delta: { x: deltaX, y: deltaY },
			};
			if (!isScrollingRef.current) {
				// Cursor moved to a different edge or started near an edge
				startEdgeScroll();
			}
			return true;
		},
		[startEdgeScroll, clearEdgeScroll],
	);

	return {
		autoEdgeScroll,
		clearEdgeScroll,
	};
};
