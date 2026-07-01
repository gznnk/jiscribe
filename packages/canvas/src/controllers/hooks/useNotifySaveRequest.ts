import { useEffect, useRef } from "react";

import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import { canvasToDoc } from "../../states/canvas/CanvasMapper";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Custom hook that notifies the parent component when a save is required
 * (after a commit or undo/redo).
 *
 * @param state - The current Canvas state
 * @param onCommit - Callback invoked on save, receiving the CanvasDoc and saveNonce
 */
export const useNotifySaveRequest = (
	state: CanvasControllerState,
	onCommit?: (doc: CanvasDoc, saveNonce: string) => void,
): void => {
	// onCommit goes through a ref so a parent passing a new function on every
	// render cannot re-fire the effect below and resend the same saveNonce.
	const onCommitRef = useRef(onCommit);
	useEffect(() => {
		onCommitRef.current = onCommit;
	});

	// Depends only on saveVersion: the closure captures the state of exactly the
	// render in which saveVersion was bumped, which is the state to persist.
	useEffect(() => {
		if (state.saveVersion > 0) {
			onCommitRef.current?.(canvasToDoc(state), state.saveNonce);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state.saveVersion]);
};
