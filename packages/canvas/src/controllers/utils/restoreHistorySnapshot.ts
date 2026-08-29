import { resetUiState } from "./resetUiState";
import { resolveDocSnapshot } from "./resolveDocSnapshot";
import { canvasToState } from "../../states/canvas/CanvasMapper";
import type { CanvasControllerState, HistoryState } from "../CanvasTypes";
import type { ICanvasRegistries } from "../registries/ICanvasRegistries";

/**
 * Whether the history may be navigated at all right now. A drag half-done or an
 * open text editor holds work the swap would throw away, so undo, redo and
 * revert are all unavailable until it is finished or abandoned.
 *
 * @param state - The controller state to judge
 * @returns True when nothing is in progress; says nothing about whether there
 *   is an entry to move to, which each caller checks for its own direction
 */
export const canNavigateHistory = (state: CanvasControllerState): boolean =>
	state.eventStartSnapshot === null && state.textEditState === null;

/**
 * Moves the canvas onto another history entry — the one state transition undo,
 * redo and revert all make. Only the stacks differ between them, so the caller
 * hands in the history it wants to end up with and this restores its `present`.
 *
 * What survives the swap is the point of sharing it: the objects come from the
 * snapshot, everything transient is dropped (resetUiState), and a short list of
 * fields is deliberately carried over — the view the user is looking at, what is
 * on the clipboard, an open modal. `commitVersion` is *not* bumped (restoring is
 * not a new edit) while `saveVersion` is (the file on disk no longer matches), a
 * pairing that is easy to get wrong in three places and impossible to get wrong
 * in one.
 *
 * @param state - The state being navigated away from
 * @param history - The stacks to end up with; its `present` is the entry
 *   restored, and the caller is what decides where the other entries went
 * @param registries - The canvas's registries; the mapper materializes the
 *   snapshot and the content resizer re-measures what is sized from its content
 * @returns The restored state. The entries that merely moved between stacks stay
 *   unresolved snapshots, so only the one being restored costs a rebuild
 */
export const restoreHistorySnapshot = (
	state: CanvasControllerState,
	history: HistoryState,
	registries: ICanvasRegistries,
): CanvasControllerState => {
	const mapper = registries.objectMapper;
	const restoredState = canvasToState(
		resolveDocSnapshot(history.present, mapper),
		mapper,
		registries.objectContentResizer,
	);

	return {
		...restoredState,
		...resetUiState(),
		viewport: state.viewport, // Preserve viewport
		// Only the host's half of the wall is carried over; the rest of the entry is
		// the measurement cache, and limitViewScroll notices the swapped objects and
		// `view` and re-measures on the next view scroll.
		scrollLimit: state.scrollLimit,
		commitVersion: state.commitVersion, // Don't update - this is history restoration, not a new commit
		saveVersion: state.saveVersion + 1,
		saveNonce: crypto.randomUUID(),
		historyCoalesce: { recorded: null, pending: null }, // History navigation is a coalescing boundary
		internalClipboard: state.internalClipboard,
		activeModal: state.activeModal, // History navigation must not close an open modal
		history,
	};
};
