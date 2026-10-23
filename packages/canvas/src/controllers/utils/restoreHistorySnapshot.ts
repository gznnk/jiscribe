import { readTextMeasurementGeneration } from "@jiscribe/doc/text/measure/textMeasurementSlot";

import { calcViewportToRevealHistoryChange } from "./calcViewportToRevealHistoryChange";
import { resetUiState } from "./resetUiState";
import { resolveDocSnapshot } from "./resolveDocSnapshot";
import { resolveScrollWallPadding } from "./resolveScrollWallPadding";
import { canvasToState } from "../../states/canvas/CanvasMapper";
import type { CanvasState } from "../../states/canvas/CanvasState";
import type {
	CanvasControllerState,
	DocSnapshot,
	HistoryState,
} from "../CanvasTypes";
import type { ICanvasRegistries } from "../registries/ICanvasRegistries";
import { createMultiSelectGroup } from "../selection/readers/createMultiSelectGroup";
import { selectRequestedIds } from "../selection/writers/selectRequestedIds";

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
 * The document half of the state an entry restores: its `source` as is, or,
 * when it was measured under another text measurement generation, its objects
 * rebuilt through its Doc with every derived box measured again.
 */
const restoreEntryState = (
	entry: DocSnapshot,
	registries: ICanvasRegistries,
): CanvasState => {
	if (entry.textMeasurementGeneration === readTextMeasurementGeneration()) {
		return entry.source;
	}
	return canvasToState(
		resolveDocSnapshot(entry, registries.objectMapper),
		registries.objectMapper,
		registries.objectContentResizer,
	);
};

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
 * The objects are the entry's own (its `source`), not a rebuild of them: every
 * object the swap leaves alone is the very reference the canvas already holds,
 * so the passes after it and the renders below it redo only what changed. An
 * entry measured under another text measurement generation (web fonts arrived
 * since) is the exception, rebuilt through its Doc so its boxes are measured
 * against the fonts now loaded.
 *
 * @param state - The state being navigated away from
 * @param history - The stacks to end up with; its `present` is the entry
 *   restored, and the caller is what decides where the other entries went
 *   (each entry leaving `present` without its Doc cache, see dropDocCache)
 * @param registries - The canvas's registries; the mapper and the content
 *   resizer rebuild an entry measured under a stale generation, and the visual
 *   bounds measure what the camera reveals and the wall it stops at
 * @returns The restored state
 */
export const restoreHistorySnapshot = (
	state: CanvasControllerState,
	history: HistoryState,
	registries: ICanvasRegistries,
): CanvasControllerState => {
	const restoredState = restoreEntryState(history.present, registries);
	const { selectedIds } = selectRequestedIds(
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
			state.objects,
			restoredState.objects,
			registries,
			resolveScrollWallPadding(
				state.scrollLimit.hostConfig,
				restoredState.view,
			),
		),
		// Only the host's half of the wall is carried over; the rest of the entry is
		// the measurement cache, and limitViewScroll notices the swapped objects and
		// `view` and re-measures on the next view scroll.
		scrollLimit: state.scrollLimit,
		// Not a new commit: this is a restoration, and nothing else on the way
		// advances the version either (the gesture close-out never does), so a
		// restore reached by a toolbar click is not recorded as an edit of its own.
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
