import { type Dispatch, useEffect, useRef } from "react";

import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import { canvasToState } from "../../states/canvas/CanvasMapper";
import type { CanvasControllerState } from "../CanvasTypes";
import type { CanvasAction } from "../reducer/CanvasActions";
import { isSameCanvasDocContent } from "../utils/isSameCanvasDocContent";

export type UseSyncExternalDocParams = {
	/** The latest CanvasDoc passed from the parent */
	canvasDoc: CanvasDoc;
	/** Nonce of the most recent sync message (used to detect fold-back saves) */
	syncNonce: string | undefined;
	/** Canvas's current state (used for content comparison) */
	canvasState: CanvasControllerState;
	/** Canvas reducer dispatch */
	dispatch: Dispatch<CanvasAction>;
	/** Callback that discards any in-progress gesture before syncing */
	resetGestureState: () => void;
};

/**
 * Custom hook that syncs external canvasDoc changes into the Canvas state.
 *
 * The very first run right after mount is skipped because the reducer already
 * initialized from the same canvasDoc (dispatching SYNC_EXTERNAL would create a
 * redundant history entry).
 */
export const useSyncExternalDoc = ({
	canvasDoc,
	syncNonce,
	canvasState,
	dispatch,
	resetGestureState,
}: UseSyncExternalDocParams): void => {
	const hasMountedRef = useRef(false);

	// Always-fresh mirror of state so the sync effect below does not need to
	// depend on (and re-run for) every state change.
	const stateRef = useRef(canvasState);
	useEffect(() => {
		stateRef.current = canvasState;
	});

	useEffect(() => {
		if (!hasMountedRef.current) {
			hasMountedRef.current = true;
			return;
		}
		// Content-identical doc (e.g. the parent re-created the object, or our own
		// save echoed back): skip entirely. Proceeding would interrupt an
		// in-progress gesture, clear all UI state, and push a redundant history
		// entry even though nothing changed.
		if (isSameCanvasDocContent(canvasDoc, stateRef.current.history.present)) {
			return;
		}
		const newState = canvasToState(canvasDoc);
		resetGestureState();
		dispatch({
			type: "SYNC_EXTERNAL",
			payload: newState,
			saveNonce: syncNonce,
		});
	}, [canvasDoc, dispatch, resetGestureState, syncNonce]);
};
