import { useCallback, useRef } from "react";

import { EVENT_NAME_CANVAS_ZOOM } from "../../../constants/core/EventNames";
import { MAX_ZOOM_LEVEL, MIN_ZOOM_LEVEL } from "../../SvgCanvasConstants";
import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";

/**
 * Options for zoom operation
 */
type ZoomOptions = {
	/** Client X coordinate to zoom around (if not provided, uses center) */
	clientX?: number;
	/** Client Y coordinate to zoom around (if not provided, uses center) */
	clientY?: number;
};

/**
 * Custom hook to handle zoom events on the canvas.
 * Zooms around the center of the current view by default, or around a specific point if provided.
 */
export const useZoom = (props: SvgCanvasSubHooksProps) => {
	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		props,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	return useCallback((newZoom: number, options?: ZoomOptions) => {
		// Bypass references to avoid function creation in every render.
		const {
			canvasState,
			setCanvasState,
			canvasRef,
			onPanZoomChange,
			eventBus,
		} = refBus.current.props;

		// Clamp zoom value within min/max limits
		const clampedZoom = Math.max(
			MIN_ZOOM_LEVEL,
			Math.min(MAX_ZOOM_LEVEL, newZoom),
		);

		if (!canvasRef?.containerRef.current) {
			// Fallback: If container ref is not available, use simple zoom
			setCanvasState((prevState) => {
				const newState = {
					...prevState,
					zoom: clampedZoom,
				};

				onPanZoomChange?.({
					minX: newState.minX,
					minY: newState.minY,
					zoom: clampedZoom,
				});

				return newState;
			});
			return;
		}

		const container = canvasRef.containerRef.current;
		const containerRect = container.getBoundingClientRect();
		const containerWidth = containerRect.width;
		const containerHeight = containerRect.height;
		const {
			zoom: currentZoom,
			minX: currentMinX,
			minY: currentMinY,
		} = canvasState;

		// Calculate current viewBox parameters
		const currentViewBoxX = currentMinX / currentZoom;
		const currentViewBoxY = currentMinY / currentZoom;
		const currentViewBoxWidth = containerWidth / currentZoom;
		const currentViewBoxHeight = containerHeight / currentZoom;

		if (containerWidth === 0 || containerHeight === 0) {
			setCanvasState((prevState) => {
				const newState = {
					...prevState,
					zoom: clampedZoom,
				};

				onPanZoomChange?.({
					minX: newState.minX,
					minY: newState.minY,
					zoom: clampedZoom,
				});

				return newState;
			});

			return;
		}

		// Determine the pointer position relative to the container.
		let pointerRelativeX = containerWidth / 2;
		let pointerRelativeY = containerHeight / 2;

		const clientX = options?.clientX;
		const clientY = options?.clientY;

		if (typeof clientX === "number" && typeof clientY === "number") {
			const relativeX = clientX - containerRect.left;
			const relativeY = clientY - containerRect.top;
			const isInsideContainer =
				relativeX >= 0 &&
				relativeX <= containerWidth &&
				relativeY >= 0 &&
				relativeY <= containerHeight;

			if (isInsideContainer) {
				pointerRelativeX = relativeX;
				pointerRelativeY = relativeY;
			}
		}

		// Convert the pointer position to SVG coordinates using the current viewBox.
		const pointerViewBoxX =
			currentViewBoxX +
			(pointerRelativeX / containerWidth) * currentViewBoxWidth;
		const pointerViewBoxY =
			currentViewBoxY +
			(pointerRelativeY / containerHeight) * currentViewBoxHeight;

		// Calculate new viewBox position to keep the pointer at the same relative position.
		const newViewBoxX = pointerViewBoxX - pointerRelativeX / clampedZoom;
		const newViewBoxY = pointerViewBoxY - pointerRelativeY / clampedZoom;

		// Convert back to minX, minY format (multiply by zoom to match viewBox calculation)
		const newMinX = newViewBoxX * clampedZoom;
		const newMinY = newViewBoxY * clampedZoom;

		setCanvasState((prevState) => {
			const newState = {
				...prevState,
				zoom: clampedZoom,
				minX: newMinX,
				minY: newMinY,
			};

			onPanZoomChange?.({
				minX: newMinX,
				minY: newMinY,
				zoom: clampedZoom,
			});

			return newState;
		});

		// Dispatch zoom event to cancel inertia scrolling
		eventBus.dispatchEvent(
			new CustomEvent(EVENT_NAME_CANVAS_ZOOM, {
				detail: { zoom: clampedZoom },
			}),
		);
	}, []);
};
