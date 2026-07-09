import type { CanvasAction } from "./CanvasActions";
import { createDocSnapshotFromState } from "../../states/canvas/DocSnapshot";
import { isSameCamera } from "../../states/canvas/Viewport";
import type { CanvasControllerState } from "../CanvasTypes";
import { handlePaste } from "./handlers/handlePaste";
import { handleCommand } from "../commands/handlers/handleCommand";
import { handleGesture } from "../gestures/handlers/handleGesture";
import type { CanvasRegistries } from "../setup/CanvasRegistries";
import { commitTextEditIfNeeded } from "../utils/commitTextEditIfNeeded";
import { handlePropertyUpdate } from "../utils/handlePropertyUpdate";
import { resetUiState } from "../utils/resetUiState";

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
				const gestureResult = handleGesture(state, action.gesture, registries);
				return recordHistoryIfNeeded(gestureResult, state);
			}

			case "COMMAND": {
				const commandResult = handleCommand(
					state,
					action.commandId,
					registries,
				);
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

			case "SET_VIEWPORT": {
				// No-op when the camera is unchanged so echoing a host-mirrored
				// viewport back through the `viewport` prop does not churn state.
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

			case "MENU_PROPERTY_UPDATE": {
				// Property updates from the ObjectMenu take two paths.
				// (1) This case: dispatched from Canvas.tsx's onPropertyUpdate callback via React onChange events (e.g. number-input).
				// (2) ObjectMenuHandler: via the gesture system (set: / slider:). That path does not go through here.
				const updated = handlePropertyUpdate(
					state,
					action.property,
					action.value,
					registries,
				);
				// Clear the vertex selection after a property change (so the Delete key acts as object deletion)
				const updatedWithVertexCleared = { ...updated, selectedVertex: null };
				if (!action.commit) {
					return updatedWithVertexCleared;
				}
				return recordHistoryIfNeeded(
					{
						...updatedWithVertexCleared,
						commitVersion: state.commitVersion + 1,
					},
					state,
				);
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
				const pasteResult = handlePaste(state, action.data, registries);
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
