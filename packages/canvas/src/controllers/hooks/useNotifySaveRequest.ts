import { useEffect, useRef } from "react";

import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import { resolveDocSnapshot } from "../../states/canvas/DocSnapshot";
import type { CanvasControllerState } from "../CanvasTypes";
import {
	createSaveRequestScheduler,
	type SaveRequestScheduler,
} from "../utils/createSaveRequestScheduler";

/**
 * Custom hook that notifies the parent component when a save is required
 * (after a commit or undo/redo).
 *
 * The Doc is read from history.present (resolved lazily, shared with the
 * history layer) instead of converting the state a second time. Delivery
 * timing is delegated to the scheduler: commits inside a coalesce chain
 * (key-repeat nudges) are debounced, everything else notifies immediately.
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

	// Always-fresh mirror of state so a deferred (debounced) notification
	// delivers the latest committed Doc, not the one from the render that
	// scheduled it.
	const stateRef = useRef(state);
	useEffect(() => {
		stateRef.current = state;
	});

	const schedulerRef = useRef<SaveRequestScheduler | null>(null);
	if (schedulerRef.current === null) {
		schedulerRef.current = createSaveRequestScheduler();
	}

	// Depends only on saveVersion: every bump is one save request. Whether the
	// commit is part of a coalesce chain is read from historyCoalesce.recorded,
	// which recordHistoryIfNeeded sets exactly for coalescing commits.
	useEffect(() => {
		if (state.saveVersion === 0) {
			return;
		}
		schedulerRef.current?.schedule(
			state.historyCoalesce.recorded !== null,
			() => {
				const latestState = stateRef.current;
				onCommitRef.current?.(
					resolveDocSnapshot(latestState.history.present),
					latestState.saveNonce,
				);
			},
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state.saveVersion]);

	// Mount-only effect: flush a pending deferred save on unmount so the last
	// nudges of a chain are not lost. This must NOT live in the effect above —
	// its cleanup runs on every saveVersion change, which would flush per
	// repeat and defeat the debounce.
	useEffect(() => {
		const scheduler = schedulerRef.current;
		return () => {
			scheduler?.flush();
		};
	}, []);
};
