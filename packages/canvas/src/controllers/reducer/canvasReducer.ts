import type { CanvasAction } from "./CanvasActions";
import { createDocSnapshotFromState } from "../../states/canvas/DocSnapshot";
import type { CanvasControllerState } from "../CanvasTypes";
import { handlePaste } from "./handlers/handlePaste";
import { handleCommand } from "../commands/handlers/handleCommand";
import { handleGesture } from "../gestures/handlers/handleGesture";
import { commitTextEditIfNeeded } from "../utils/commitTextEditIfNeeded";
import { handlePropertyUpdate } from "../utils/handlePropertyUpdate";
import { resetUiState } from "../utils/resetUiState";

/**
 * Root reducer for the canvas controller. Dispatches each CanvasAction to the appropriate
 * handler and, for mutating actions, records history when the commit version changes.
 */
export const canvasReducer = (
	state: CanvasControllerState,
	action: CanvasAction,
): CanvasControllerState => {
	switch (action.type) {
		case "GESTURE": {
			const gestureResult = handleGesture(state, action.gesture);
			return recordHistoryIfNeeded(gestureResult, state);
		}

		case "COMMAND": {
			const commandResult = handleCommand(state, action.commandId);
			return recordHistoryIfNeeded(commandResult, state);
		}

		case "SET_DOC_DEFAULTS": {
			// No-op when unchanged so the mount-time sync dispatch does not
			// produce a new state object.
			if (state.docDefaults.fontFamily === action.docDefaults.fontFamily) {
				return state;
			}
			return { ...state, docDefaults: action.docDefaults };
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

		case "MENU_PROPERTY_UPDATE": {
			// Property updates from the ObjectMenu take two paths.
			// (1) This case: dispatched from Canvas.tsx's onPropertyUpdate callback via React onChange events (e.g. number-input).
			// (2) ObjectMenuHandler: via the gesture system (set: / slider:). That path does not go through here.
			const updated = handlePropertyUpdate(
				state,
				action.property,
				action.value,
			);
			// Clear the vertex selection after a property change (so the Delete key acts as object deletion)
			const updatedWithVertexCleared = { ...updated, selectedVertex: null };
			if (!action.commit) {
				return updatedWithVertexCleared;
			}
			return recordHistoryIfNeeded(
				{ ...updatedWithVertexCleared, commitVersion: state.commitVersion + 1 },
				state,
			);
		}

		case "SYNC_EXTERNAL": {
			// Self-save round-trip: if action.saveNonce matches state.saveNonce, this SYNC_EXTERNAL
			// is our own data being echoed back, so only update the object references and leave
			// past/future (history) unchanged.
			if (
				action.saveNonce !== undefined &&
				action.saveNonce === state.saveNonce
			) {
				return {
					...state,
					objects: action.payload.objects,
					rootIds: action.payload.rootIds,
				};
			}

			// A genuine external change: record the current present into past, then update present.
			// Clear future (to prevent redoing to an old state after the external change).
			// Since the objects are swapped out, clear all UI state as well (selection, in-progress operations, etc.).
			// Only viewport is kept (to preserve the user's current view).
			return {
				...state,
				objects: action.payload.objects,
				rootIds: action.payload.rootIds,
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
			return {
				...state,
				textEditState: {
					...state.textEditState,
					text: action.text,
				},
			};
		}

		case "END_TEXT_EDIT": {
			if (!state.textEditState) {
				return state;
			}

			if (action.commit) {
				const commitResult = commitTextEditIfNeeded(state);
				return recordHistoryIfNeeded(commitResult, state);
			}

			// On cancel, clear only textEditState
			return {
				...state,
				textEditState: null,
			};
		}

		case "PASTE": {
			const pasteResult = handlePaste(state, action.data);
			return recordHistoryIfNeeded(pasteResult, state);
		}

		case "CLOSE_CONTEXT_MENU": {
			if (state.contextMenuPosition === null) {
				return state;
			}
			return { ...state, contextMenuPosition: null };
		}

		default:
			return state;
	}
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
	if (
		!(
			state.commitVersion > 0 &&
			state.commitVersion !== previousState.commitVersion
		)
	) {
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
