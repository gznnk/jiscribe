import { PRECISION } from "@jiscribe/doc/model/objects/utils/precision";
import {
	convertRectToBoundingBox,
	roundToDecimal,
	type Point,
	type Rect,
} from "@jiscribe/geometry";
import { type Dispatch, type RefObject, useMemo } from "react";

import { useCanvasStateMirror } from "./useCanvasStateMirror";
import { ZOOM } from "../../constants/zoom";
import type { Camera, Viewport } from "../../states/canvas/Viewport";
import type { CanvasControllerState } from "../CanvasTypes";
import { getSvgPoint } from "../gestures/recognizer/utils/getSvgPoint";
import type { CanvasAction } from "../reducer/CanvasActions";
import type { CanvasRegistries } from "../registries/CanvasRegistries";
import { calcFitViewport } from "../utils/calcFitViewport";
import { calcSelectionFitViewport } from "../utils/calcSelectionFitViewport";
import { calcViewportForBounds } from "../utils/calcViewportForBounds";
import { calcVisibleWorldRect } from "../utils/calcVisibleWorldRect";
import { getClientPoint } from "../utils/getClientPoint";

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
	/**
	 * Fit an arbitrary world rect into the view — the same fit the other two make,
	 * aimed at a region the caller worked out for itself (the bounds of a search
	 * result, the region an image was captured of).
	 *
	 * The rect is what the view is fitted *around*, not what it ends up showing:
	 * the container's aspect ratio decides how much extra comes into view on one
	 * axis. Read {@link getVisibleWorldRect} back for what is actually on screen.
	 *
	 * @param rect - The region to bring into view, in world coordinates. A
	 *   negative extent is normalized; a rect flat on one axis (a horizontal
	 *   line) still fits along the other
	 * @param options - Margin around the rect; defaults to 48 screen px
	 * @returns The camera that was applied, or null for a rect with no extent on
	 *   either axis (a point) — the view is then left alone
	 */
	fitToRect(rect: Rect, options?: CanvasFitOptions): Camera | null;
	/**
	 * The part of the world the view currently shows, which is where a shape has
	 * to be put to land in front of the user (and what a `"viewport"` export
	 * crops to). The read side of {@link fitToRect}, which cannot answer it — a
	 * fitted rect is not the visible one.
	 *
	 * @returns The visible rect in world coordinates. Before the container has
	 *   been measured it is zero-sized rather than null, the same zero the
	 *   viewport itself starts at
	 */
	getVisibleWorldRect(): Rect;
	/**
	 * Converts a client point — the space `PointerEvent.clientX/Y` and
	 * `getBoundingClientRect` are in — to world coordinates, so a position taken
	 * from the page (a drop, a host overlay's corner) can be used as a canvas
	 * coordinate.
	 *
	 * @param clientPoint - The point in client coordinates
	 * @returns The world point, or null before the canvas has mounted its `<svg>`
	 */
	toWorld(clientPoint: Point): Point | null;
	/**
	 * The inverse of {@link toWorld}: where a world point currently sits on
	 * screen, for a host placing its own DOM over the canvas. The answer moves
	 * with every pan and zoom, so read it again rather than caching it.
	 *
	 * @param worldPoint - The point in world coordinates
	 * @returns The point in client coordinates, or null before the canvas has
	 *   mounted its `<svg>`
	 */
	toClient(worldPoint: Point): Point | null;
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
 * @param svgRef - Ref to the canvas's `<svg>`, whose screen CTM converts between
 *   world and client coordinates; null until the view mounts
 */
export const useViewportHandle = (
	dispatch: Dispatch<CanvasAction>,
	canvasState: CanvasControllerState,
	registries: CanvasRegistries,
	svgRef: RefObject<SVGSVGElement | null>,
): CanvasViewportHandle => {
	const canvasStateRef = useCanvasStateMirror(canvasState);

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
					ZOOM.PRECISION,
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

			fitToRect: (rect, options) => {
				const { viewport } = canvasStateRef.current;
				return applyFitted(
					calcViewportForBounds(convertRectToBoundingBox(rect), {
						width: viewport.width,
						height: viewport.height,
						padding: options?.padding,
					}),
				);
			},

			getVisibleWorldRect: () =>
				calcVisibleWorldRect(canvasStateRef.current.viewport),

			toWorld: (clientPoint) =>
				svgRef.current
					? getSvgPoint(svgRef.current, clientPoint.x, clientPoint.y)
					: null,

			toClient: (worldPoint) =>
				svgRef.current
					? getClientPoint(svgRef.current, worldPoint.x, worldPoint.y)
					: null,
		};
	}, [canvasStateRef, dispatch, registries, svgRef]);
};
