import {
	normalizeRichText,
	richTextToPlain,
} from "@jiscribe/doc/model/objects/types/RichText";

import type { CanvasAction } from "./CanvasActions";
import type { CanvasState } from "../../states/canvas/CanvasState";
import type { CanvasControllerState, DocSnapshot } from "../CanvasTypes";
import { isSameCamera } from "../utils/isSameCamera";
import { handlePaste } from "./handlers/handlePaste";
import {
	canApplyTransformProperty,
	handleTransformPropertyUpdate,
} from "./handlers/handleTransformPropertyUpdate";
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
				// A left edge that moved would carry the drawing with it, since the
				// screen position of a world point is measured from that edge. Undoing
				// the move on minX in the same commit keeps the drawing pinned: the
				// sidebar covers and uncovers the left strip rather than pushing it.
				const { leftEdgeShift } = action;
				const shouldCompensate =
					leftEdgeShift !== undefined && leftEdgeShift !== 0;
				return {
					...state,
					viewport: {
						...state.viewport,
						minX: shouldCompensate
							? state.viewport.minX + leftEdgeShift / state.viewport.zoom
							: state.viewport.minX,
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

			case "STYLE_PROPERTY_UPDATE": {
				// Style property updates take two paths.
				// (1) This case: dispatched from Canvas.tsx's onPropertyUpdate callback via React
				//     onChange events — the ObjectMenu's number input and keyboard-driven slider, and
				//     the properties sidebar's callback-writing controls — none of which fires a gesture.
				// (2) ObjectMenuHandler: via the gesture system (set: / slider:), from the ObjectMenu's
				//     buttons and the sidebar controls that declare themselves as object-menu targets.
				//     That path does not go through here.
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
				return commitPropertyUpdate(
					updatedWithVertexCleared,
					state,
					action.coalesceHistory
						? buildPropertyCoalesceKey(
								state,
								STYLE_PROPERTY_COALESCE_PREFIX,
								action.property,
							)
						: null,
					registries,
				);
			}

			case "TRANSFORM_PROPERTY_UPDATE": {
				// The sibling route to STYLE_PROPERTY_UPDATE for the geometry the style
				// registry does not own; dispatched from the properties sidebar's
				// number inputs, which fire no gesture (see TransformPropertyUpdateAction).
				const updated = handleTransformPropertyUpdate(
					state,
					action.property,
					action.value,
					registries,
				);
				// Nothing moved. For a preview that is the end of it; for a commit it is
				// the normal case, since the field previews while typing and the frame
				// holds the value by the time Enter commits it — the commit is what
				// records that preview. Only a value nothing could take stays a no-op.
				if (
					updated === state &&
					(!action.commit ||
						!canApplyTransformProperty(state, action.property, action.value))
				) {
					return state;
				}
				// Same one-shot flattening and vertex clearing as the menu route: this
				// path bypasses handleGesture, which is what normally does both (#213).
				const updatedWithVertexCleared = {
					...updated,
					objects: materializeObjects(updated.objects),
					selectedVertex: null,
				};
				if (!action.commit) {
					return reconcileObjectContentSizes(
						updatedWithVertexCleared,
						state,
						registries.objectContentResizer,
					);
				}
				return commitPropertyUpdate(
					updatedWithVertexCleared,
					state,
					action.coalesceHistory
						? buildPropertyCoalesceKey(
								state,
								TRANSFORM_PROPERTY_COALESCE_PREFIX,
								action.property,
							)
						: null,
					registries,
				);
			}

			case "DOCUMENT_PROPERTY_UPDATE": {
				// The third property route: what the sidebar states about the document
				// itself rather than about a selection. No object is touched, so the
				// COW flattening and vertex clearing the other two routes do would
				// have nothing to act on here.
				//
				// `background` is the only DocumentProperty so far, so the value goes
				// straight to it; null drops the field, which is what puts the surface
				// back under the host theme (the headless setBackground op's rule).
				const background = action.value ?? undefined;
				// A commit of the color already set is recorded, not skipped: the
				// picker's text input previews while typing, so the color is already
				// in place when Enter commits it (the same rule as the transform route).
				if (state.background === background && !action.commit) {
					return state;
				}
				const updated = { ...state, background };
				if (!action.commit) {
					return updated;
				}
				return commitPropertyUpdate(
					updated,
					state,
					action.coalesceHistory
						? buildPropertyCoalesceKey(
								state,
								DOCUMENT_PROPERTY_COALESCE_PREFIX,
								action.property,
							)
						: null,
					registries,
				);
			}

			case "SYNC_EXTERNAL": {
				// Only genuine external changes reach here: fold-backs of our own saves
				// are recognized by the self-save nonce tracker and dropped before dispatch
				// (see useSyncExternalDoc), so they never touch history or UI state.
				//
				// The same document edited elsewhere, so the entries recorded for it stay
				// usable: the current present moves onto past and the edit becomes
				// undoable like any local commit.
				return adoptDocumentState(state, action.payload, [
					...state.history.past,
					state.history.present,
				]);
			}

			case "LOAD_DOCUMENT": {
				// Another document, so its predecessor's entries go with it: undoing into
				// them would restore the old contents under the new document's name
				// (see LoadDocumentAction).
				return adoptDocumentState(state, action.payload, []);
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

/**
 * Installs a document handed in from outside over the current state, shared by
 * the two actions that do so (SYNC_EXTERNAL / LOAD_DOCUMENT). Everything the doc
 * carries is replaced wholesale and every transient field that pointed into the
 * old objects is reset with them; the viewport alone survives, since it belongs
 * to the person looking rather than to the document.
 *
 * @param past - The undo stack to keep, capped here at the newest 50 entries.
 *   The one thing the two actions disagree on: an external edit to the same
 *   document keeps the stack, another document drops it (pass `[]`)
 */
const adoptDocumentState = (
	state: CanvasControllerState,
	payload: CanvasState,
	past: readonly DocSnapshot[],
): CanvasControllerState => ({
	...state,
	objects: payload.objects,
	rootIds: payload.rootIds,
	background: payload.background,
	view: payload.view,
	...resetUiState(),
	// Adopting a document is a history boundary. Since past is set directly without
	// going through recordHistoryIfNeeded, explicitly reset the coalesce state here
	// (do not carry over the recorded value from a preceding nudge).
	historyCoalesce: { recorded: null, pending: null },
	history: {
		past: past.slice(-50),
		present: createDocSnapshotFromState(payload),
		// Cleared either way: a redo would reapply an edit that the incoming
		// document knows nothing about.
		future: [],
	},
});

/** Prefix of the coalesce key for consecutive style-property commits (ObjectMenu or sidebar) */
const STYLE_PROPERTY_COALESCE_PREFIX = "style-property";

/** Prefix of the coalesce key for consecutive properties-sidebar transform commits */
const TRANSFORM_PROPERTY_COALESCE_PREFIX = "transform-property";

/** Prefix of the coalesce key for consecutive properties-sidebar document commits */
const DOCUMENT_PROPERTY_COALESCE_PREFIX = "document-property";

/**
 * Builds the coalesce key for a property commit. The target identity is part of the
 * key, so a changed selection (or a different property) automatically becomes a
 * separate undo entry; the prefix keeps the two routes apart, since the same name
 * can mean a different edit on each.
 */
const buildPropertyCoalesceKey = (
	state: CanvasControllerState,
	prefix: string,
	property: string,
): string => {
	const target =
		state.selectedIds.length > 0
			? state.selectedIds.join(",")
			: (state.selectedConnectorId ?? "");
	return `${prefix}:${property}:${target}`;
};

/**
 * Commits a property update that has already been applied: raises commitVersion,
 * arms the coalesce key, re-measures and re-routes, and records the entry.
 *
 * Shared by the three property routes (menu / transform / document), which differ
 * only in what they apply. The reconciles run unconditionally because the caller
 * has already decided this is a commit — there is no commitVersion gate left to
 * re-check.
 */
const commitPropertyUpdate = (
	updatedState: CanvasControllerState,
	previousState: CanvasControllerState,
	coalesceKey: string | null,
	registries: CanvasRegistries,
): CanvasControllerState => {
	const committedResult = {
		...updatedState,
		commitVersion: previousState.commitVersion + 1,
		historyCoalesce:
			coalesceKey === null
				? updatedState.historyCoalesce
				: { ...updatedState.historyCoalesce, pending: coalesceKey },
	};
	const resizedResult = reconcileObjectContentSizes(
		committedResult,
		previousState,
		registries.objectContentResizer,
	);
	const reconciledResult = reconcileConnectorVertices(
		resizedResult,
		registries,
	);
	return recordHistoryIfNeeded(reconciledResult, previousState);
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
