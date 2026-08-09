import type React from "react";
import { type Dispatch, useEffect, useMemo, useRef } from "react";

import type { CanvasControllerState } from "../CanvasTypes";
import { isViewportPanDrag } from "../gestures/handlers/canvas/utils/isViewportPanDrag";
import { GestureRecognizer } from "../gestures/recognizer/GestureRecognizer";
import type {
	GestureCallback,
	PointerEventHandlers,
} from "../gestures/recognizer/GestureRecognizerTypes";
import type { CanvasAction } from "../reducer/CanvasActions";

export type UseGestureRecognizerParams = {
	dispatch: Dispatch<CanvasAction>;
	containerRef: React.RefObject<HTMLElement | null>;
	svgRef: React.RefObject<SVGSVGElement | null>;
	canvasState: CanvasControllerState;
};

export type UseGestureRecognizerReturn = {
	pointerHandlers: PointerEventHandlers;
	wheelHandler: (e: WheelEvent) => void;
	resetGestureState: () => void;
};

/**
 * Creates and owns a single {@link GestureRecognizer} instance, wiring recognized
 * gestures to the reducer via `dispatch` and returning stable pointer/wheel handlers.
 *
 * Lifecycle invariant: one component lifetime = one instance. The ref is set once
 * on the first render and never reset to null, so the handlers memoized below stay
 * valid for the whole lifetime. Effect cleanup only cancels pending work
 * (cancelPendingGesture is non-terminal), which keeps StrictMode's
 * setup→cleanup→setup sequence working with the same instance (#78) while still
 * stopping the RAF callback after a real unmount (#14).
 */
export const useGestureRecognizer = ({
	dispatch,
	containerRef,
	svgRef,
	canvasState,
}: UseGestureRecognizerParams): UseGestureRecognizerReturn => {
	// Hold the GestureRecognizer instance in a ref
	const recognizerRef = useRef<GestureRecognizer | null>(null);

	// Ref that always holds the latest canvasState
	const canvasStateRef = useRef<CanvasControllerState>(canvasState);
	canvasStateRef.current = canvasState; // Set the latest value on every render

	// Lazily initialize the instance into the ref to guarantee "created only once".
	// (useMemo may discard its memoized value and recompute, creating a second
	//  instance; a ref is never discarded. The constructor is side-effect-free, so
	//  render-time creation is safe.)
	// dispatch has stable identity since it comes from useReducer, so it can be safely
	// bound in the initial closure.
	if (recognizerRef.current === null) {
		// Recognized gestures are dispatched to the reducer as GESTURE actions
		// (the GestureRecognizer class itself stays React-independent via the callback contract)
		const gestureCallback: GestureCallback = (gesture) => {
			dispatch({ type: "GESTURE", gesture });
		};
		recognizerRef.current = new GestureRecognizer({
			gestureCallback,
			containerRef,
			svgRef,
			canvasStateRef,
			// Canvas pan drags may convert to a pinch on a second touch (the "which
			// drags are pans" knowledge stays beside the routing, not the recognizer).
			// The state the policy needs is read here through the ref, so the
			// recognizer passes only the target kind.
			shouldPinchFromDrag: (targetKind) =>
				isViewportPanDrag(targetKind, canvasStateRef.current),
			// A released middle-/right-button pan glides to a stop instead of stopping
			// dead: those are exactly the drags CanvasEventHandler pans with, wherever
			// they land. The same test excludes touch pans, which arrive as button 0.
			shouldFlingFromDrag: (button) => button === 1 || button === 2,
		});
	}

	// Cleanup cancels pending work only — it must NOT reset the ref to null.
	// StrictMode runs setup→cleanup→setup without re-rendering, so a nulled ref
	// would never be recreated and the memoized handlers would keep pointing at a
	// zombie instance (#78). cancelPendingGesture also covers #14: on a real
	// unmount it cancels the pending RAF so the gesture callback cannot fire.
	useEffect(() => {
		return () => {
			recognizerRef.current?.cancelPendingGesture();
		};
	}, []);

	// Keep the handlers object identity stable so the props passed to child components stay stable
	const handlers = useMemo<UseGestureRecognizerReturn>(
		() => ({
			pointerHandlers: recognizerRef.current!.getHandlers(),
			wheelHandler: recognizerRef.current!.getWheelHandler(),
			resetGestureState: () => recognizerRef.current?.cancelPendingGesture(),
		}),
		[],
	);

	return handlers;
};
