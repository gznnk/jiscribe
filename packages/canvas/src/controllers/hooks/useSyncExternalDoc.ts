import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { type Dispatch, useEffect, useRef } from "react";

import { canvasToState } from "../../states/canvas/CanvasMapper";
import type { CanvasControllerState } from "../CanvasTypes";
import type { CanvasAction } from "../reducer/CanvasActions";
import type { CanvasRegistries } from "../registries/CanvasRegistries";
import type { createSelfSaveNonceTracker } from "./support/createSelfSaveNonceTracker";
import { isSameCanvasDocContent } from "../utils/isSameCanvasDocContent";
import { resolveDocSnapshot } from "../utils/resolveDocSnapshot";

export type UseSyncExternalDocParams = {
	/** The latest CanvasDoc passed from the parent */
	canvasDoc: CanvasDoc;
	/** Nonce of the most recent sync message (used to detect fold-back saves) */
	syncNonce: string | undefined;
	/**
	 * Host token identifying which load `canvasDoc` came from; a changed value
	 * means another document was put on the canvas (see the `docLoadId` prop).
	 * Undefined throughout means the host never opts in, leaving every incoming
	 * doc an external edit to the same document.
	 */
	docLoadId: string | undefined;
	/** Canvas's current state (used for content comparison) */
	canvasState: CanvasControllerState;
	/** Canvas reducer dispatch */
	dispatch: Dispatch<CanvasAction>;
	/** Callback that discards any in-progress gesture before syncing */
	resetGestureState: () => void;
	/**
	 * Shared tracker (populated by useNotifySaveRequest on delivery) that tells a
	 * fold-back of our own save apart from a genuine external change.
	 */
	selfSaveNonceTracker: ReturnType<typeof createSelfSaveNonceTracker>;
	/**
	 * Passed in explicitly (not read via context) because Canvas is the provider
	 * of the registries context and so cannot consume it via a hook.
	 */
	registries: CanvasRegistries;
};

/**
 * Custom hook that syncs external canvasDoc changes into the Canvas state.
 *
 * The very first run right after mount is skipped because the reducer already
 * initialized from the same canvasDoc (dispatching SYNC_EXTERNAL would create a
 * redundant history entry).
 *
 * A changed `docLoadId` is a history boundary rather than an edit: it says the
 * host put another document on a canvas that stays mounted, and the previous
 * document's undo entries must not survive into it.
 */
export const useSyncExternalDoc = ({
	canvasDoc,
	syncNonce,
	docLoadId,
	canvasState,
	dispatch,
	resetGestureState,
	selfSaveNonceTracker,
	registries,
}: UseSyncExternalDocParams): void => {
	const hasMountedRef = useRef(false);
	// Seeded with the value of the first render, so the doc the reducer already
	// initialized from is never mistaken for a second load.
	const lastDocLoadIdRef = useRef(docLoadId);
	const { objectMapper, objectContentResizer } = registries;

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
		// A load the host declared. Checked ahead of everything below because a
		// declared load has to drop the history even when the fold-back or the
		// content comparison would have called the doc unchanged.
		if (lastDocLoadIdRef.current !== docLoadId) {
			lastDocLoadIdRef.current = docLoadId;
			resetGestureState();
			dispatch({
				type: "LOAD_DOCUMENT",
				payload: canvasToState(canvasDoc, objectMapper, objectContentResizer),
			});
			return;
		}
		// Our own save echoed back: the canvas already holds the authoritative
		// state, so a fold-back carries no new information — and may even arrive
		// after a newer commit (issue #29), in which case adopting it would revert
		// the canvas. Ignore it entirely (this also skips the gesture/UI reset
		// below). Consuming the nonce here drains the pending set on every fold-back.
		if (selfSaveNonceTracker.consumeIfSelfSave(syncNonce)) {
			return;
		}
		// Content-identical doc (e.g. the parent re-created the object): skip
		// entirely. Proceeding would interrupt an in-progress gesture, clear all UI
		// state, and push a redundant history entry even though nothing changed.
		if (
			isSameCanvasDocContent(
				canvasDoc,
				resolveDocSnapshot(stateRef.current.history.present, objectMapper),
			)
		) {
			return;
		}
		const newState = canvasToState(
			canvasDoc,
			objectMapper,
			objectContentResizer,
		);
		resetGestureState();
		dispatch({
			type: "SYNC_EXTERNAL",
			payload: newState,
		});
	}, [
		canvasDoc,
		docLoadId,
		dispatch,
		resetGestureState,
		syncNonce,
		selfSaveNonceTracker,
		objectMapper,
		objectContentResizer,
	]);
};
