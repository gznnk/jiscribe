import { roundToDecimal, type Point } from "@jiscribe/geometry";
import { type Dispatch, useLayoutEffect, useMemo, useRef } from "react";

import { PRECISION } from "../../constants/precision";
import { ZOOM } from "../../constants/zoom";
import type { Camera, Viewport } from "../../states/canvas/Viewport";
import type { CanvasControllerState } from "../CanvasTypes";
import type { CanvasAction } from "../reducer/CanvasActions";
import type { CanvasRegistries } from "../registries/CanvasRegistries";
import { calcFitViewport } from "../utils/calcFitViewport";
import { calcSelectionFitViewport } from "../utils/calcSelectionFitViewport";

/** Per-call options shared by the fit methods of {@link CanvasViewportHandle} */
export type CanvasFitOptions = {
	/**
	 * Empty margin (screen px) kept around the target on every side.
	 * Defaults to 48, the same margin as the Zoom to Fit shortcut.
	 */
	padding?: number;
};

/**
 * Imperative viewport API exposed on the `viewport` namespace of the Canvas
 * handle (`ref.current.viewport`). Hosts push a new camera (pan/zoom)
 * programmatically — fit-to-content, jump-to-node, a scripted intro — without
 * the viewport being a controlled value.
 *
 * Deliberately imperative rather than a `viewport` value prop: the canvas
 * advances its own camera every frame during continuous gestures (trackpad pan,
 * pinch zoom), so a value prop mirrored back through `onViewportChange` would lag
 * a frame behind the gesture and revert to a stale camera (visible shake). A
 * one-shot imperative set has no such feedback path. Reads flow out through
 * `onViewportChange`; the two directions are independent.
 */
export type CanvasViewportHandle = {
	/** Set the camera (pan/zoom); width/height stay container-measured. */
	setViewport(camera: Camera): void;
	/**
	 * Read the viewport as it stands: the camera plus the container-measured
	 * size in screen px. World size is `width / zoom` by `height / zoom`.
	 */
	getViewport(): Viewport;
	/**
	 * Move the camera so a world point sits at the center of the view.
	 *
	 * @param point - The world coordinate to put at the center
	 * @param options - `zoom` replaces the current zoom (clamped to 0.1–10);
	 *   omitting it keeps the view's current zoom
	 * @returns The camera that was applied
	 */
	centerOn(point: Point, options?: { zoom?: number }): Camera;
	/**
	 * Fit every object into the view (the Zoom to Fit shortcut, programmatically).
	 *
	 * @param options - Margin around the content; defaults to 48 screen px
	 * @returns The camera that was applied, or null when there is nothing to fit
	 *   (empty canvas, or content with no extent) — the view is then left alone
	 */
	fitToContent(options?: CanvasFitOptions): Camera | null;
	/**
	 * Fit the current selection into the view (the Zoom to Selection shortcut,
	 * programmatically). A selected group is fitted through its children.
	 *
	 * @param options - Margin around the selection; defaults to 48 screen px
	 * @returns The camera that was applied, or null when nothing is selected or
	 *   the selection has no extent — the view is then left alone
	 */
	fitToSelection(options?: CanvasFitOptions): Camera | null;
};

const toCamera = ({ minX, minY, zoom }: Viewport): Camera => ({
	minX,
	minY,
	zoom,
});

/**
 * Builds the stable viewport sub-handle assembled into the Canvas handle.
 *
 * @param dispatch - The canvas reducer's dispatch; every method here goes
 *   through SET_VIEWPORT
 * @param canvasState - Current controller state, read at call time (not at
 *   render time) so the handle stays referentially stable
 * @param registries - The canvas's registry bundle; its visual bounds decide how
 *   much of what a shape draws outside its geometry box the fits keep in view
 */
export const useViewportHandle = (
	dispatch: Dispatch<CanvasAction>,
	canvasState: CanvasControllerState,
	registries: CanvasRegistries,
): CanvasViewportHandle => {
	// Always-fresh mirror of the state, read when a method is called. Must be a
	// layout effect: a host can call the handle synchronously right after a
	// commit, before passive effects run (same pattern as useCanvasExport).
	const canvasStateRef = useRef(canvasState);
	useLayoutEffect(() => {
		canvasStateRef.current = canvasState;
	});

	return useMemo(() => {
		const applyCamera = (camera: Camera): Camera => {
			dispatch({ type: "SET_VIEWPORT", camera });
			return camera;
		};
		const applyFitted = (fitted: Viewport | null): Camera | null =>
			fitted === null ? null : applyCamera(toCamera(fitted));

		return {
			setViewport: (camera: Camera) =>
				dispatch({ type: "SET_VIEWPORT", camera }),

			getViewport: () => canvasStateRef.current.viewport,

			centerOn: (point, options) => {
				const {
					width,
					height,
					zoom: currentZoom,
				} = canvasStateRef.current.viewport;
				const zoom = roundToDecimal(
					Math.max(ZOOM.MIN, Math.min(ZOOM.MAX, options?.zoom ?? currentZoom)),
					PRECISION.ZOOM,
				);
				return applyCamera({
					zoom,
					minX: roundToDecimal(
						point.x - width / (2 * zoom),
						PRECISION.COORDINATE,
					),
					minY: roundToDecimal(
						point.y - height / (2 * zoom),
						PRECISION.COORDINATE,
					),
				});
			},

			fitToContent: (options) => {
				const { objects, viewport } = canvasStateRef.current;
				return applyFitted(
					calcFitViewport(
						objects,
						{
							width: viewport.width,
							height: viewport.height,
							padding: options?.padding,
						},
						registries.objectVisualBounds,
					),
				);
			},

			fitToSelection: (options) => {
				const { objects, selectedIds, selectedConnectorId, viewport } =
					canvasStateRef.current;
				const targetIds =
					selectedConnectorId === null
						? selectedIds
						: [...selectedIds, selectedConnectorId];
				return applyFitted(
					calcSelectionFitViewport(
						targetIds,
						objects,
						{
							width: viewport.width,
							height: viewport.height,
							padding: options?.padding,
						},
						registries.objectVisualBounds,
					),
				);
			},
		};
	}, [dispatch, registries]);
};
