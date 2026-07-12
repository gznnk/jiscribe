import { type Dispatch, useEffect, useRef } from "react";

import { type Camera, isSameCamera } from "../../states/canvas/Viewport";
import type { CanvasAction } from "../reducer/CanvasActions";

/**
 * Drives the internal viewport from a host-controlled `viewport` prop.
 *
 * The prop's camera is applied (via SET_VIEWPORT) whenever its **value** changes
 * relative to the last one applied — not on internal changes, and not on object
 * identity. This lets the host set pan/zoom at any time (fit-to-screen, restore
 * from getState/setState, a minimap, …) while internal gestures move the camera
 * freely in between and report back through `onViewportChange`.
 *
 * Loop- and revert-safety comes from two value guards working together:
 *   - Here: dispatch only when the incoming prop value differs from the last
 *     value we applied. An internal pan re-renders with the prop still holding
 *     the pre-pan value, so this guard suppresses a spurious sync-in that would
 *     otherwise revert the pan before the host mirrors the new camera back.
 *   - In the reducer: SET_VIEWPORT no-ops when the camera already matches, so the
 *     host echoing the new value back (prop value changed → dispatch) collapses
 *     to nothing once internal state already holds it.
 * The round-trip therefore settles in one cycle with no fighting.
 *
 * Passing a static value does not freeze the camera: internal gestures keep
 * moving it until the host changes the prop value again. To pin the view, the
 * host re-asserts the desired camera.
 *
 * When `controlledViewport` is undefined the viewport is fully uncontrolled and
 * this hook does nothing, preserving the default behavior.
 *
 * @param controlledViewport - The host-controlled camera (undefined = uncontrolled)
 * @param dispatch - The Canvas reducer's dispatch
 */
export const useControlledViewport = (
	controlledViewport: Camera | undefined,
	dispatch: Dispatch<CanvasAction>,
): void => {
	// The last camera value pushed into the reducer. Compared by value so a host
	// passing a fresh object with an unchanged camera each render does not
	// re-dispatch, and an internal pan (prop unchanged) does not sync-in/revert.
	//
	// Seeded with the mount-time camera: createInitialControllerState already
	// applies it to the initial viewport (to avoid a first-paint flash), so the
	// mount effect must treat it as already-applied and not re-dispatch. useRef's
	// argument is honored only on the first render, so this captures the seed.
	const lastAppliedRef = useRef<Camera | null>(controlledViewport ?? null);
	useEffect(() => {
		if (controlledViewport === undefined) {
			return;
		}
		const lastApplied = lastAppliedRef.current;
		if (lastApplied !== null && isSameCamera(lastApplied, controlledViewport)) {
			return;
		}
		lastAppliedRef.current = controlledViewport;
		dispatch({ type: "SET_VIEWPORT", camera: controlledViewport });
	}, [controlledViewport, dispatch]);
};
