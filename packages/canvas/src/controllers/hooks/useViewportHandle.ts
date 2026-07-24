import { type Dispatch, useMemo } from "react";

import type { Camera } from "../../states/canvas/Viewport";
import type { CanvasAction } from "../reducer/CanvasActions";

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
};

/** Builds the stable viewport sub-handle assembled into the Canvas handle. */
export const useViewportHandle = (
	dispatch: Dispatch<CanvasAction>,
): CanvasViewportHandle =>
	useMemo(
		() => ({
			setViewport: (camera: Camera) =>
				dispatch({ type: "SET_VIEWPORT", camera }),
		}),
		[dispatch],
	);
