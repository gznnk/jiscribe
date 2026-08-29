import {
	normalizeRichText,
	richTextToPlain,
} from "@jiscribe/doc/model/objects/types/RichText";

import type { CanvasAction } from "./CanvasActions";
import { isSameCamera } from "../../states/canvas/Viewport";
import type { CanvasControllerState } from "../CanvasTypes";
import { handlePaste } from "./handlers/handlePaste";
import { handleCommand } from "../commands/handlers/handleCommand";
import { handleGesture } from "../gestures/handlers/handleGesture";
import type { CanvasRegistries } from "../registries/CanvasRegistries";
import { commitTextEditIfNeeded } from "../utils/commitTextEditIfNeeded";
import { materializeObjects } from "../utils/cowObjects";
import { createMultiSelectGroup } from "../utils/createMultiSelectGroup";
import {
	reconcileConnectorVertices,
	reconcileConnectorVerticesIfCommitted,
} from "../utils/reconcileConnectorVertices";
import { reconcileObjectContentSizes } from "../utils/reconcileObjectContentSizes";
import { resetUiState } from "../utils/resetUiState";
import { createDocSnapshotFromState } from "../utils/resolveDocSnapshot";
import { resolveRequestedSelection } from "../utils/resolveRequestedSelection";
import {
	canNavigateHistory,
	restoreHistorySnapshot,
} from "../utils/restoreHistorySnapshot";
import { toggleTextEditFormat } from "../utils/toggleTextEditFormat";

/**
 * Builds the root reducer for the canvas controller, closing over the canvas's
 * registry bundle. React's `useReducer` requires a `(state, action) => state`
 * signature, so the bundle is captured here (rather than passed per dispatch)
 * and handed to each handler that needs it — the registries are dependencies,
 * not state (#165).
 */
export const createCanvasReducer =
	(registries: CanvasRegistries) =>
	(
		state: CanvasControllerState,
		action: CanvasAction,
	): CanvasControllerState => {
		switch (action.type) {
			case "GESTURE": {
				const gestureResult = handleGesture(
					state,
					action.gesture,
					registries,
					action.gestureHandling,
				);
				// Boxes first, connector vertices second: a vertex is settled against
				// the shape outlines, which a re-measured box moves. The box pass has
				// no commit gate — a slider drag must not clip its own text — while the
				// vertex pass keeps one, since settling vertices is a commit-time step.
				const resizedResult = reconcileObjectContentSizes(
					gestureResult,
					state,
					registries.objectContentResizer,
				);
				const reconciledResult = reconcileConnectorVerticesIfCommitted(
					resizedResult,
					state,
					registries,
				);
				return recordHistoryIfNeeded(reconciledResult, state);
			}

			case "COMMAND": {
				const commandResult = handleCommand(
					state,
					action.commandId,
					registries,
				);
				const resizedResult = reconcileObjectContentSizes(
					commandResult,
					state,
					registries.objectContentResizer,
				);
				const reconciledResult = reconcileConnectorVerticesIfCommitted(
					resizedResult,
					state,
					registries,
				);
				return recordHistoryIfNeeded(reconciledResult, state);
			}

			case "REVERT_HISTORY": {
				const { past, present, future } = state.history;
				const markIndex = past.findIndex((entry) => entry === action.entry);
				// Off the stack, or already the present one: either way there is
				// nothing to undo back to (see RevertHistoryAction).
				if (markIndex < 0 || !canNavigateHistory(state)) {
					return state;
				}
				// The stacks the same number of undos would have left: everything
				// after the target moves to the redo stack, oldest first, with the
				// state being left behind on top of it.
				const revertedResult = restoreHistorySnapshot(
					state,
					{
						past: past.slice(0, markIndex),
						present: past[markIndex],
						future: [...past.slice(markIndex + 1), present, ...future],
					},
					registries,
				);
				// The same reconciliation the undos it stands in for would have run,
				// so the two cannot diverge. recordHistoryIfNeeded is deliberately not
				// called: restoring is not a commit, and it would no-op on the
				// unchanged commitVersion anyway.
				const resizedResult = reconcileObjectContentSizes(
					revertedResult,
					state,
					registries.objectContentResizer,
				);
				return reconcileConnectorVerticesIfCommitted(
					resizedResult,
					state,
					registries,
				);
			}

			case "REMEASURE_TEXT": {
				// Web fonts arrive after the first paint, so every box derived before
				// then was measured against a fallback face. Not a commit: the doc
				// stores no size, so nothing about it changed.
				return reconcileObjectContentSizes(
					state,
					state,
					registries.objectContentResizer,
					true,
				);
			}

			case "CONTAINER_RESIZE": {
				return {
					...state,
					viewport: {
						...state.viewport,
						width: action.dimensions.width,
						height: action.dimensions.height,
					},
				};
			}

			case "SET_VIEWPORT": {
				// Camera and measured size land together; see SetViewportAction.
				return { ...state, viewport: action.viewport };
			}

			case "SET_CAMERA": {
				// No-op when the camera is unchanged so a repeated imperative
				// setViewport with the same camera does not churn state.
				if (isSameCamera(state.viewport, action.camera)) {
					return state;
				}
				// Keep width/height (container-measured); only the camera is host-controlled.
				const { minX, minY, zoom } = action.camera;
				return {
					...state,
					viewport: { ...state.viewport, minX, minY, zoom },
				};
			}

			case "SET_SELECTION": {
				const { selectedIds, selectedConnectorId } = resolveRequestedSelection(
					action.ids,
					state.objects,
				);
				return {
					...state,
					selectedIds,
					selectedConnectorId,
					multiSelectGroup: createMultiSelectGroup(
						selectedIds,
						state.objects,
						state.multiSelectGroup,
					),
					// The channels are mutually exclusive, and the UI hanging off the
					// previous selection means nothing for the new one (same clears as
					// SelectAllCommand).
					selectedVertex: null,
					selectedTextSlot: null,
					objectMenuOpenId: null,
					stencilLibraryOpenCategory: null,
				};
			}

			case "MENU_PROPERTY_UPDATE": {
				// Property updates from the ObjectMenu take two paths.
				// (1) This case: dispatched from Canvas.tsx's onPropertyUpdate callback via React onChange
				//     events (number-input, and a slider driven from the keyboard, which fires no gesture).
				// (2) ObjectMenuHandler: via the gesture system (set: / slider:). That path does not go through here.
				const updated = registries.styleProperty.apply(
					state,
					action.property,
					action.value,
				);
				// Clear the vertex selection after a property change (so the Delete key acts as object deletion).
				// This path bypasses handleGesture, so flatten the COW view here
				// (one-shot update, same pattern as MoveCommands; #213).
				const updatedWithVertexCleared = {
					...updated,
					objects: materializeObjects(updated.objects),
					selectedVertex: null,
				};
				if (!action.commit) {
					// A live preview draws at the new typography, so its box has to be
					// measured at the new typography too.
					return reconcileObjectContentSizes(
						updatedWithVertexCleared,
						state,
						registries.objectContentResizer,
					);
				}
				// This case decides the commit itself (action.commit above), so the
				// unconditional reconcile applies — no commitVersion gate to re-check.
				const committedResult = {
					...updatedWithVertexCleared,
					commitVersion: state.commitVersion + 1,
					historyCoalesce: action.coalesceHistory
						? {
								...updatedWithVertexCleared.historyCoalesce,
								pending: buildMenuPropertyCoalesceKey(state, action.property),
							}
						: updatedWithVertexCleared.historyCoalesce,
				};
				const resizedResult = reconcileObjectContentSizes(
					committedResult,
					state,
					registries.objectContentResizer,
				);
				const reconciledResult = reconcileConnectorVertices(
					resizedResult,
					registries,
				);
				return recordHistoryIfNeeded(reconciledResult, state);
			}

			case "SYNC_EXTERNAL": {
				// Only genuine external changes reach here: fold-backs of our own saves
				// are recognized by the self-save nonce tracker and dropped before dispatch
				// (see useSyncExternalDoc), so they never touch history or UI state.
				//
				// Record the current present into past, then update present.
				// Clear future (to prevent redoing to an old state after the external change).
				// Since the objects are swapped out, clear all UI state as well (selection, in-progress operations, etc.).
				// Only viewport is kept (to preserve the user's current view).
				return {
					...state,
					objects: action.payload.objects,
					rootIds: action.payload.rootIds,
					background: action.payload.background,
					view: action.payload.view,
					...resetUiState(),
					// An external change is a history boundary. Since past is pushed directly without going
					// through recordHistoryIfNeeded, explicitly reset the coalesce state here (do not carry
					// over the recorded value from a preceding nudge).
					historyCoalesce: { recorded: null, pending: null },
					history: {
						past: [...state.history.past, state.history.present].slice(-50),
						present: createDocSnapshotFromState(action.payload),
						future: [],
					},
				};
			}

			case "UPDATE_TEXT_EDIT": {
				if (!state.textEditState) {
					return state;
				}
				// The editor reports the body as it reads back off its surface, styling
				// included, so the draft holds exactly what is on screen; a connector
				// label holds only a plain string.
				if (state.textEditState.kind === "shape") {
					return {
						...state,
						textEditState: {
							...state.textEditState,
							text: normalizeRichText(action.text),
						},
					};
				}
				return {
					...state,
					textEditState: {
						...state.textEditState,
						text: richTextToPlain(action.text),
					},
				};
			}

			case "UPDATE_TEXT_EDIT_SELECTION": {
				if (state.textEditState?.kind !== "shape") {
					return state;
				}
				return {
					...state,
					textEditState: {
						...state.textEditState,
						selection: action.selection,
					},
				};
			}

			case "TOGGLE_TEXT_FORMAT": {
				const styled = toggleTextEditFormat(
					state,
					action.format,
					registries.objectTextStyleDefaults,
				);
				if (styled === state) {
					return state;
				}
				// The styling is written into the object right away (the session stays
				// open), so the box it is measured into has to follow, and the change is
				// its own undo entry rather than riding on the commit that ends the edit.
				// One keystroke is one commit, which is why the commit is raised here and
				// not in styleTextEditSelection, whose menu callers preview.
				const resizedResult = reconcileObjectContentSizes(
					{ ...styled, commitVersion: state.commitVersion + 1 },
					state,
					registries.objectContentResizer,
				);
				return recordHistoryIfNeeded(resizedResult, state);
			}

			case "END_TEXT_EDIT": {
				if (!state.textEditState) {
					return state;
				}

				if (action.commit) {
					const commitResult = commitTextEditIfNeeded(state);
					const resizedResult = reconcileObjectContentSizes(
						commitResult,
						state,
						registries.objectContentResizer,
					);
					const reconciledResult = reconcileConnectorVerticesIfCommitted(
						resizedResult,
						state,
						registries,
					);
					return recordHistoryIfNeeded(reconciledResult, state);
				}

				// On cancel, clear only textEditState
				return {
					...state,
					textEditState: null,
				};
			}

			case "PASTE": {
				const pasteResult = handlePaste(state, action.data, registries);
				const resizedResult = reconcileObjectContentSizes(
					pasteResult,
					state,
					registries.objectContentResizer,
				);
				const reconciledResult = reconcileConnectorVerticesIfCommitted(
					resizedResult,
					state,
					registries,
				);
				return recordHistoryIfNeeded(reconciledResult, state);
			}

			case "CLOSE_CONTEXT_MENU": {
				if (state.contextMenuPosition === null) {
					return state;
				}
				return { ...state, contextMenuPosition: null };
			}

			case "CLOSE_MODAL": {
				if (state.activeModal === null) {
					return state;
				}
				return { ...state, activeModal: null };
			}

			default:
				return state;
		}
	};

/** Prefix of the coalesce key for consecutive ObjectMenu property commits */
const MENU_PROPERTY_COALESCE_PREFIX = "menu-property";

/**
 * Builds the coalesce key for an ObjectMenu property commit. The target identity is
 * part of the key, so a changed selection (or a different property) automatically
 * becomes a separate undo entry.
 */
const buildMenuPropertyCoalesceKey = (
	state: CanvasControllerState,
	property: string,
): string => {
	const target =
		state.selectedIds.length > 0
			? state.selectedIds.join(",")
			: (state.selectedConnectorId ?? "");
	return `${MENU_PROPERTY_COALESCE_PREFIX}:${property}:${target}`;
};

/**
 * Time window (milliseconds) for coalescing consecutive operations into a single undo entry.
 * As long as operations with the same coalesceKey continue within this interval, only present is
 * updated without growing past.
 */
const HISTORY_COALESCE_WINDOW_MS = 1000;

/**
 * Records history if commitVersion has changed, and also increments saveVersion.
 * Only canvasReducer may call this.
 *
 * On commit, if an event handler has set a coalesce key in state.historyCoalesce.pending, then as
 * long as the previous commit (recorded) has the same key and is within the time window, present is
 * swapped without growing past, coalescing consecutive operations into a single entry (e.g. repeated
 * arrow-key nudges). pending is consumed by the history layer here and always reset to null.
 */
const recordHistoryIfNeeded = (
	state: CanvasControllerState,
	previousState: CanvasControllerState,
): CanvasControllerState => {
	if (!(
		state.commitVersion > 0 &&
		state.commitVersion !== previousState.commitVersion
	)) {
		return state;
	}

	const now = Date.now();

	// Match the coalesce key set by the handler (intent) against the previous commit's coalesce id (recorded)
	const pending = state.historyCoalesce.pending;
	const previousRecorded = previousState.historyCoalesce.recorded;
	const canMerge =
		pending !== null &&
		previousRecorded !== null &&
		previousRecorded.key === pending &&
		now - previousRecorded.time <= HISTORY_COALESCE_WINDOW_MS;

	const past = canMerge
		? state.history.past
		: [...state.history.past, state.history.present].slice(-50);

	return {
		...state,
		saveVersion: state.saveVersion + 1,
		saveNonce: crypto.randomUUID(),
		// Consume pending and update recorded (a non-coalescing commit becomes null = coalesce boundary). pending is always reset to null.
		historyCoalesce: {
			recorded: pending === null ? null : { key: pending, time: now },
			pending: null,
		},
		history: {
			past,
			// Lazy snapshot: the Doc tree is not rebuilt here. During a coalesce
			// merge past is untouched too, so a key-repeat commit does zero
			// O(N) conversion work.
			present: createDocSnapshotFromState(state),
			future: [],
		},
	};
};
