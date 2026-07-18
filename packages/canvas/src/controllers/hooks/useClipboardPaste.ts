import { type Dispatch, type RefObject, useCallback, useRef } from "react";

import type { ObjectStateValidatorRegistry } from "../../states/registry/ObjectStateValidatorRegistry";
import {
	type ClipboardData,
	isClipboardData,
} from "../commands/selection/ClipboardData";
import { useCanvasRegistries } from "../contexts/CanvasRegistriesContext";
import type { CanvasAction } from "../reducer/CanvasActions";

/**
 * Reads the OS clipboard (falling back to internalClipboard) and dispatches PASTE.
 *
 * navigator.clipboard.readText() gives no ordering guarantee across concurrent
 * calls, so pastes fired in quick succession could dispatch PASTE out of
 * invocation order (issue #48). Each call is therefore enqueued onto pasteChain
 * (FIFO): the next read starts only after the previous paste has dispatched,
 * pinning dispatch order to invocation order without dropping any paste.
 *
 * Exported for unit tests; production code uses it via useClipboardPaste.
 */
export const enqueueClipboardPaste = (
	pasteChain: RefObject<Promise<void>>,
	internalClipboard: ClipboardData | null,
	dispatch: Dispatch<CanvasAction>,
	objectStateValidator: ObjectStateValidatorRegistry,
): Promise<void> => {
	const runPaste = async () => {
		let data = null;
		try {
			const text = await navigator.clipboard.readText();
			const parsed: unknown = JSON.parse(text);
			if (isClipboardData(parsed, objectStateValidator)) {
				data = parsed;
			}
		} catch {
			// clipboard read failure or parse error
		}
		data ??= internalClipboard;
		if (!data) {
			// Even when there is nothing to paste, close the menu if this came from a
			// menu click. PASTE is not dispatched, so without explicitly closing here
			// the menu would stay open.
			dispatch({ type: "CLOSE_CONTEXT_MENU" });
			return;
		}
		dispatch({ type: "PASTE", data });
	};
	// runPaste catches its own errors, but chain through rejections too so an
	// unexpected failure cannot wedge every later paste.
	const nextChain = pasteChain.current.then(runPaste, runPaste);
	pasteChain.current = nextChain;
	return nextChain;
};

/**
 * Custom hook that builds the paste handler.
 * The Ctrl+V / Cmd+V shortcut is defined by PasteCommand in the command
 * registry and wired to this handler via useKeyboardShortcuts' callbacks.
 *
 * It tries to read the OS clipboard and falls back to internalClipboard on failure.
 * Concurrent invocations are serialized FIFO (see enqueueClipboardPaste).
 *
 * @param internalClipboard - Fallback used when the OS clipboard cannot be read
 * @param dispatch - Canvas reducer dispatch
 * @returns The paste handler callback (used by the keyboard shortcut and the context menu)
 */
export const useClipboardPaste = (
	internalClipboard: ClipboardData | null,
	dispatch: Dispatch<CanvasAction>,
): (() => Promise<void>) => {
	// Held in a ref so the FIFO guarantee survives handlePaste re-creation
	// (internalClipboard changes remake the callback, but the chain must span them).
	const pasteChainRef = useRef<Promise<void>>(Promise.resolve());
	const { objectStateValidator } = useCanvasRegistries();

	const handlePaste = useCallback(
		() =>
			enqueueClipboardPaste(
				pasteChainRef,
				internalClipboard,
				dispatch,
				objectStateValidator,
			),
		[dispatch, internalClipboard, objectStateValidator],
	);

	return handlePaste;
};
