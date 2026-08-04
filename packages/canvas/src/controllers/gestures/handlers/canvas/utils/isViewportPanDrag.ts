import type { CanvasControllerState } from "../../../../CanvasTypes";

/**
 * Whether a confirmed drag with this target is a viewport pan (the touch
 * one-finger background drag routed by CanvasEventHandler). Injected into the
 * GestureRecognizer as its shouldPinchFromDrag policy, wrapped in a closure that
 * supplies canvasState: a second touch may close such a drag and convert it into
 * a pinch, while object drags and shape drawing must not be interrupted (#25).
 * Living beside the routing keeps the "what is a pan" knowledge out of the
 * recognizer.
 *
 * @param targetKind - The drag's data-kind target fixed at pointerdown;
 *   undefined for targets with no [data-kind] ancestor.
 * @param canvasState - Current controller state; only shapeDrawing is consulted
 *   (drawing claims canvas-target drags for itself).
 */
export const isViewportPanDrag = (
	targetKind: string | undefined,
	canvasState: CanvasControllerState,
): boolean => targetKind === "canvas" && !canvasState.shapeDrawing;
