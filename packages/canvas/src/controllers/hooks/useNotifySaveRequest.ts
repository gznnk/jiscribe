import { useEffect, useLayoutEffect, useRef } from "react";

import { useConstant } from "./useConstant";
import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import type { CanvasControllerState } from "../CanvasTypes";
import type { CanvasRegistries } from "../registries/CanvasRegistries";
import { resolveDocSnapshot } from "../utils/resolveDocSnapshot";
import { createNonceDeliveryGuard } from "./support/createNonceDeliveryGuard";
import { createSaveRequestScheduler } from "./support/createSaveRequestScheduler";
import type { createSelfSaveNonceTracker } from "./support/createSelfSaveNonceTracker";

/**
 * Custom hook that notifies the parent component when a save is required
 * (after a commit or undo/redo).
 *
 * The Doc is read from history.present (resolved lazily, shared with the
 * history layer) instead of converting the state a second time. Delivery
 * timing is delegated to the scheduler: commits inside a coalesce chain
 * (key-repeat nudges) are deferred and flushed on a boundary event —
 * keyup / window blur / unmount — everything else notifies immediately.
 *
 * @param state - The current Canvas state
 * @param onCommit - Callback invoked on save, receiving the CanvasDoc and saveNonce
 * @param selfSaveNonceTracker - Shared tracker; each delivered nonce is registered
 *   so useSyncExternalDoc can recognize its fold-back as a self-save
 * @param registries - Passed in explicitly (not read via context) because Canvas
 *   is the provider of the registries context and so cannot consume it via a hook
 */
export const useNotifySaveRequest = (
	state: CanvasControllerState,
	onCommit: ((doc: CanvasDoc, saveNonce: string) => void) | undefined,
	selfSaveNonceTracker: ReturnType<typeof createSelfSaveNonceTracker>,
	registries: CanvasRegistries,
): void => {
	const { objectMapper } = registries;

	// onCommit goes through a ref so a parent passing a new function on every
	// render cannot re-fire the effect below and resend the same saveNonce.
	const onCommitRef = useRef(onCommit);
	useEffect(() => {
		onCommitRef.current = onCommit;
	});

	// Always-fresh mirror of state so a deferred (debounced) notification
	// delivers the latest committed Doc, not the one from the render that
	// scheduled it. Must be a layout effect: the keyup/blur flush below runs
	// synchronously inside the DOM event, and a passive-effect mirror could
	// still hold the previous commit at that point — the flush would then
	// deliver a stale doc/nonce that the host echoes back as an "external"
	// change, reverting the user's last commit.
	const stateRef = useRef(state);
	useLayoutEffect(() => {
		stateRef.current = state;
	});

	// A boundary flush can run before the schedule effect of the commit it just
	// delivered (stateRef is updated in a layout effect, the schedule below in a
	// passive one). That commit's own schedule must not deliver it a second
	// time, so every saveNonce is delivered at most once (see the guard's doc).
	const deliveryGuard = useConstant(createNonceDeliveryGuard);
	const scheduler = useConstant(createSaveRequestScheduler);

	// Depends only on saveVersion: every bump is one save request. Whether the
	// commit is part of a coalesce chain is read from historyCoalesce.recorded,
	// which recordHistoryIfNeeded sets exactly for coalescing commits.
	useEffect(() => {
		if (state.saveVersion === 0) {
			return;
		}
		scheduler.schedule(state.historyCoalesce.recorded !== null, () => {
			const latestState = stateRef.current;
			if (!deliveryGuard.shouldDeliver(latestState.saveNonce)) {
				return;
			}
			// Record the delivered nonce so its fold-back is recognized as a
			// self-save even if a later save's fold-back returns first (issue #29).
			selfSaveNonceTracker.register(latestState.saveNonce);
			onCommitRef.current?.(
				resolveDocSnapshot(latestState.history.present, objectMapper),
				latestState.saveNonce,
			);
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state.saveVersion]);

	// Mount-only effect: deferred saves are flushed by boundary events, not by
	// time — keyup ends a key-repeat chain (the only coalescing source today)
	// and window blur means no further keyup will arrive. flush is a no-op
	// without a pending save, so listening to every key is safe. Unmount also
	// flushes so the last chain is not lost. This must NOT live in the effect
	// above — its cleanup runs on every saveVersion change, which would flush
	// per repeat and defeat the deferral.
	useEffect(() => {
		const flushPendingSave = () => {
			scheduler.flush();
		};
		document.addEventListener("keyup", flushPendingSave);
		window.addEventListener("blur", flushPendingSave);
		return () => {
			document.removeEventListener("keyup", flushPendingSave);
			window.removeEventListener("blur", flushPendingSave);
			flushPendingSave();
		};
		// scheduler is a stable useConstant value, so this stays mount-only.
	}, [scheduler]);
};
