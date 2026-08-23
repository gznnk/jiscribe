import { isSameCamera } from "../../../../states/canvas/Viewport";
import type { CanvasControllerState } from "../../../CanvasTypes";
import type { CanvasRegistries } from "../../../registries/CanvasRegistries";
import { calcScrollBounds } from "../../../utils/calcScrollBounds";
import { clampScrolledCamera } from "../../../utils/clampScrolledCamera";
import { resolveScrollWallPadding } from "../../../utils/resolveScrollWallPadding";
import type { Gesture } from "../../recognizer/GestureRecognizerTypes";

/**
 * Whether this gesture is one of the deliberate view scrolls the limit applies
 * to: the wheel (Ctrl held makes it a zoom, which is never limited), the grab
 * pan of a middle-/right-button drag, the one-finger touch pan, and the fling a
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
 * through one limit rather than each handler carrying its own. Both halves of the
 * wall are settled here rather than at mount: which wall applies is re-resolved
 * per scroll (the host's setting is fixed, but the document's declaration travels
 * with whatever document is loaded), and the rect is re-measured when the objects
 * or the `view` have changed since it was last measured — lazily, because a drag
 * rewrites `objects` every frame while no view scroll can be in progress, and
 * measuring walks every object. Resolving is reads only, so the unwalled canvas
 * leaves without measuring anything.
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
		!isViewScroll(gesture) ||
		isSameCamera(nextState.viewport, previousState.viewport)
	) {
		return nextState;
	}

	const wallPadding = resolveScrollWallPadding(
		scrollLimit.hostConfig,
		nextState.view,
	);
	if (wallPadding === null) {
		return nextState;
	}

	const measured =
		scrollLimit.measuredFrom === nextState.objects &&
		scrollLimit.measuredView === nextState.view
			? scrollLimit
			: {
					hostConfig: scrollLimit.hostConfig,
					rect: calcScrollBounds(
						wallPadding,
						nextState.objects,
						registries.objectVisualBounds,
					),
					measuredFrom: nextState.objects,
					measuredView: nextState.view,
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
