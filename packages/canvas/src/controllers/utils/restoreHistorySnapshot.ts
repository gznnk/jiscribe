import { calcViewportToRevealHistoryChange } from "./calcViewportToRevealHistoryChange";
import { createMultiSelectGroup } from "./createMultiSelectGroup";
import { resetUiState } from "./resetUiState";
import { resolveDocSnapshot } from "./resolveDocSnapshot";
import { resolveRequestedSelection } from "./resolveRequestedSelection";
import { resolveScrollWallPadding } from "./resolveScrollWallPadding";
import { canvasToState } from "../../states/canvas/CanvasMapper";
import type { CanvasControllerState, HistoryState } from "../CanvasTypes";
import type { ICanvasRegistries } from "../registries/ICanvasRegistries";

/**
 * Whether undo, redo and revert should be offered right now — the enabled look
 * of a toolbar button or menu item. An open text editor holds work the swap
 * would throw away, and its own Ctrl+Z belongs to the textarea, so the offer is
 * withdrawn until the edit is finished or abandoned. A drag in progress is not
 * part of this: no button can be pressed while the pointer is captured, so
 * dimming one only makes the bar flicker for the length of the drag. The drag is
 * guarded where it matters instead, on execution ({@link canNavigateHistory}).
 *
 * @param state - The controller state to judge
 * @returns True when no text edit is open; says nothing about whether there is
 *   an entry to move to, which each caller checks for its own direction
 */
export const canOfferHistoryNavigation = (
	state: CanvasControllerState,
): boolean => state.textEditState === null;

/**
 * Whether the history may actually be navigated right now — the guard on the
 * execution itself. Beyond {@link canOfferHistoryNavigation}, a drag half-done
 * holds work the swap would throw away, so a keyboard shortcut arriving
 * mid-drag must leave the state as it is.
 *
 * @param state - The controller state to judge
 * @returns True when nothing is in progress; says nothing about whether there
 *   is an entry to move to, which each caller checks for its own direction
 */
export const canNavigateHistory = (state: CanvasControllerState): boolean =>
	canOfferHistoryNavigation(state) && state.activeDrag === null;

/**
 * Moves the canvas onto another history entry — the one state transition undo,
 * redo and revert all make. Only the stacks differ between them, so the caller
 * hands in the history it wants to end up with and this restores its `present`.
 *
 * What survives the swap is the point of sharing it: the objects come from the
 * snapshot, everything transient is dropped (resetUiState), and a short list of
 * fields is deliberately carried over — the zoom, what is on the clipboard, an
 * open modal, the two sidebars, and the selection as far as the restored objects
 * still hold it. The selection is not part of any entry:
 * the ids selected before the swap are simply re-selected if they exist after
 * it, so undoing a property change leaves the shape selected for the next try,
 * while undoing a creation (or redoing a deletion) loses the shape and its
 * selection with it. Neither is the camera: it pans only as far as it takes to
 * show what the swap changed (calcViewportToRevealHistoryChange), stopping at
 * the scroll wall, so a change off screen is not undone out of sight.
 * `commitVersion` is *not* bumped (restoring is not a new edit) while
 * `saveRequest` is raised (the file on disk no longer matches), a pairing that
 * is easy to get wrong in three places and impossible to get wrong in one.
 *
 * @param state - The state being navigated away from
 * @param history - The stacks to end up with; its `present` is the entry
 *   restored, and the caller is what decides where the other entries went
 * @param registries - The canvas's registries; the mapper materializes the
 *   snapshots, the content resizer re-measures what is sized from its content,
 *   and the visual bounds measure what the camera reveals and the wall it
 *   stops at
 * @returns The restored state. The entries that merely moved between stacks stay
 *   unresolved snapshots; only the one being restored and the one being left
 *   (compared to find what changed) are resolved
 */
export const restoreHistorySnapshot = (
	state: CanvasControllerState,
	history: HistoryState,
	registries: ICanvasRegistries,
): CanvasControllerState => {
	const mapper = registries.objectMapper;
	const restoredDoc = resolveDocSnapshot(history.present, mapper);
	const restoredState = canvasToState(
		restoredDoc,
		mapper,
		registries.objectContentResizer,
	);
	const { selectedIds } = resolveRequestedSelection(
		state.selection.objectIds,
		restoredState.objects,
	);

	return {
		...restoredState,
		...resetUiState(),
		selection: { objectIds: selectedIds, part: null },
		// Rebuilt rather than carried: the objects it wraps may have moved or gone.
		multiSelectGroup: createMultiSelectGroup(
			selectedIds,
			restoredState.objects,
			state.multiSelectGroup,
		),
		viewport: calcViewportToRevealHistoryChange(
			state.viewport,
			resolveDocSnapshot(state.history.present, mapper),
			state.objects,
			restoredDoc,
			restoredState.objects,
			registries.objectVisualBounds,
			resolveScrollWallPadding(
				state.scrollLimit.hostConfig,
				restoredState.view,
			),
		),
		// Only the host's half of the wall is carried over; the rest of the entry is
		// the measurement cache, and limitViewScroll notices the swapped objects and
		// `view` and re-measures on the next view scroll.
		scrollLimit: state.scrollLimit,
		// Not a new commit: this is a restoration. The gesture close-out reads the
		// moved `history` as exactly that and leaves the version alone too, so a
		// restore reached by a click is not recorded as an edit of its own
		// (EVENT_COMMIT_TYPES in handleGesture).
		commitVersion: state.commitVersion,
		saveRequest: {
			version: state.saveRequest.version + 1,
			nonce: crypto.randomUUID(),
		},
		historyCoalesce: { recorded: null, pending: null }, // History navigation is a coalescing boundary
		internalClipboard: state.internalClipboard,
		activeModal: state.activeModal, // History navigation must not close an open modal
		// The two sidebars are chrome, not part of the document being swapped: they
		// stay open, and as collapsed, as the user left them.
		stencilLibraryPanel: state.stencilLibraryPanel,
		propertyPanel: state.propertyPanel,
		history,
	};
};
