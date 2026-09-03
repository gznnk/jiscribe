import { type RefObject, useLayoutEffect, useRef } from "react";

import type { CanvasControllerState } from "../CanvasTypes";

/**
 * An always-fresh ref to the controller state, for a handle to read at call
 * time rather than at render time — which is what lets every handle method be
 * built once and stay referentially stable for the canvas's lifetime.
 *
 * A **layout** effect, not a passive one: a host may call a handle synchronously
 * right after a commit (in its own layout effect, or straight after dispatching),
 * and a passive effect would not have run yet, so the handle would answer from
 * the state before the commit. Everything on the handle reads through this, so
 * the guarantee holds namespace-wide rather than per method.
 *
 * @param canvasState - The state as of this render
 * @returns The ref; read `.current` inside a handle method, never during render
 *   (its value during render is the previous commit's)
 */
export const useCanvasStateMirror = (
	canvasState: CanvasControllerState,
): RefObject<CanvasControllerState> => {
	const canvasStateRef = useRef(canvasState);
	useLayoutEffect(() => {
		canvasStateRef.current = canvasState;
	});
	return canvasStateRef;
};
