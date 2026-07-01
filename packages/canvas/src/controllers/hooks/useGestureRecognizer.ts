import type React from "react";
import { type Dispatch, useEffect, useMemo, useRef } from "react";

import type { CanvasControllerState } from "../CanvasTypes";
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
 * The instance is created once and disposed on unmount.
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
	// (useMemo may discard its memoized value and recompute, breaking the create/dispose
	//  pairing and risking a leaked instance; a ref is never discarded.)
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
		});
	}

	// On unmount, cancel any pending RAF so the gesture callback does not fire after
	// unmount. After disposal, reset the ref to null so it is reliably recreated on
	// remount (keeping create/dispose paired even across StrictMode's
	// mount→unmount→mount).
	useEffect(() => {
		return () => {
			recognizerRef.current?.dispose();
			recognizerRef.current = null;
		};
	}, []);

	// Keep the handlers object identity stable so the props passed to child components stay stable
	const handlers = useMemo<UseGestureRecognizerReturn>(
		() => ({
			pointerHandlers: recognizerRef.current!.getHandlers(),
			wheelHandler: recognizerRef.current!.getWheelHandler(),
			resetGestureState: () => recognizerRef.current?.resetGestureState(),
		}),
		[],
	);

	return handlers;
};
