import { isSameCamera } from "../../../../states/canvas/Viewport";
import type { CanvasControllerState } from "../../../CanvasTypes";
import type { CanvasRegistries } from "../../../registries/CanvasRegistries";
import { calcScrollBounds } from "../../../utils/calcScrollBounds";
import { clampScrolledCamera } from "../../../utils/clampScrolledCamera";
import type { Gesture } from "../../recognizer/GestureRecognizerTypes";

/**
 * Whether this gesture is one of the deliberate view scrolls the limit applies
 * to: the wheel (Ctrl held makes it a zoom, which is never limited), the grab
 * pan of a middle-/right-button drag, the one-finger touch pan, and the glide a
 * released pan leaves behind.
 *
 * Every other way the view moves is left alone — the scroll a drag carries with
 * it (the wheel turned mid-drag, a drag held at the container edge), a zoom, a
 * host camera. Limiting those would take back scrolling the user asked for: a
 * drag's own scroll would snap away the moment the drag ended, which is the
 * opposite of what dragging to the edge is for.
 */
const isViewScroll = (gesture: Gesture): boolean => {
	switch (gesture.type) {
		case "wheel":
			return !gesture.mods.ctrl;
		case "inertialScroll":
			return true;
		case "dragStart":
		case "drag":
			// Middle/right button is the grab pan; a one-finger touch drag on the
			// background pans too (both routed by CanvasEventHandler).
			return (
				gesture.button === 1 ||
				gesture.button === 2 ||
				(gesture.pointerType === "touch" && gesture.targetKind === "canvas")
			);
		default:
			return false;
	}
};

/**
 * The state with the view held inside the scroll limit, if this gesture is one
 * the limit applies to and it actually moved the view.
 *
 * The last step of handleGesture, so every gesture that moves the camera passes
 * through one limit rather than each handler carrying its own. The limit rect is
 * re-measured here when the objects have changed since it was last measured —
 * lazily, because a drag rewrites `objects` every frame while no view scroll can
 * be in progress, and measuring walks every object.
 *
 * @param nextState - State as the gesture's handlers left it
 * @param previousState - State before the gesture: tells whether the camera
 *   moved at all, and is where a view already outside the limit is held to (see
 *   {@link clampScrolledCamera})
 * @param gesture - The gesture just handled; decides whether the limit applies
 * @param registries - Supplies the visual bounds the extent is measured with, so
 *   the wall accounts for what a shape draws outside its geometry box
 */
export const limitViewScroll = (
	nextState: CanvasControllerState,
	previousState: CanvasControllerState,
	gesture: Gesture,
	registries: CanvasRegistries,
): CanvasControllerState => {
	const { scrollLimit } = nextState;
	if (
		scrollLimit === null ||
		!isViewScroll(gesture) ||
		isSameCamera(nextState.viewport, previousState.viewport)
	) {
		return nextState;
	}

	const measured =
		scrollLimit.measuredFrom === nextState.objects
			? scrollLimit
			: {
					config: scrollLimit.config,
					rect: calcScrollBounds(
						scrollLimit.config,
						nextState.objects,
						registries.objectVisualBounds,
					),
					measuredFrom: nextState.objects,
				};

	const camera = clampScrolledCamera(
		nextState.viewport,
		previousState.viewport,
		measured.rect,
	);
	if (measured === scrollLimit && isSameCamera(nextState.viewport, camera)) {
		return nextState;
	}
	return {
		...nextState,
		scrollLimit: measured,
		viewport: { ...nextState.viewport, ...camera },
	};
};
