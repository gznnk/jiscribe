import type { Dimensions } from "@jiscribe/geometry";

import type { DocCreationDefaults } from "../../schemas/objects/types/DocCreationDefaults";
import type { RichText } from "../../schemas/objects/types/RichText";
import type { CanvasState } from "../../states/canvas/CanvasState";
import type { Camera } from "../../states/canvas/Viewport";
import type { CanvasGestureHandling } from "../CanvasGestureHandling";
import type { ClipboardData } from "../commands/selection/ClipboardData";
import type { Gesture } from "../gestures/recognizer/GestureRecognizerTypes";
import type { TextEditFormat } from "../utils/toggleTextEditFormat";

/**
 * Gesture action - handles user gestures
 */
export type GestureAction = {
	type: "GESTURE";
	gesture: Gesture;
	/**
	 * The `gestureHandling` prop at dispatch time; stamped onto the CanvasEvent
	 * so handlers can leave host-page gestures alone. Absent means "greedy".
	 */
	gestureHandling?: CanvasGestureHandling;
};

/**
 * Container resize action - updates viewport dimensions
 */
export type ContainerResizeAction = {
	type: "CONTAINER_RESIZE";
	dimensions: Dimensions;
};

/**
 * Sync external action - syncs canvas state from external source
 */
export type SyncExternalAction = {
	type: "SYNC_EXTERNAL";
	payload: CanvasState;
};

/**
 * Set viewport action - applies a camera (pan/zoom), keeping the measured
 * width/height. Dispatched by the imperative `ref.current.viewport.setViewport`
 * (useViewportHandle) so a host can move the view programmatically.
 */
export type SetViewportAction = {
	type: "SET_VIEWPORT";
	camera: Camera;
};

/**
 * Set selection action - replaces the selection with the given ids (an empty
 * list clears it). Dispatched by the imperative `ref.current.selection.select`
 * (useSelectionHandle) so a host can select programmatically.
 */
export type SetSelectionAction = {
	type: "SET_SELECTION";
	ids: readonly string[];
};

/**
 * Command action - handles keyboard shortcuts and context menu commands
 */
export type CommandAction = {
	type: "COMMAND";
	commandId: string;
};

/**
 * Update text edit action - updates text during editing. The editor reports the
 * whole edited body as it reads back off its surface, styling included
 * (readEditableRichText), so the draft holds exactly what is on screen; a
 * connector label editor reports a plain string, the only form its label holds.
 */
export type UpdateTextEditAction = {
	type: "UPDATE_TEXT_EDIT";
	text: RichText;
};

/**
 * Update text edit selection action - records what the open editor has selected,
 * so styling can address that stretch of the text (toggleTextEditFormat).
 */
export type UpdateTextEditSelectionAction = {
	type: "UPDATE_TEXT_EDIT_SELECTION";
	/** UTF-16 offsets into the text being edited; collapsed (start === end) for a plain caret. */
	selection: { start: number; end: number };
};

/**
 * Toggle text format action - turns bold / italic / underline on or off over the
 * text the open editor has selected, leaving the rest of the slot as it is.
 */
export type ToggleTextFormatAction = {
	type: "TOGGLE_TEXT_FORMAT";
	format: TextEditFormat;
};

/**
 * End text edit action - ends text editing with commit or cancel
 */
export type EndTextEditAction = {
	type: "END_TEXT_EDIT";
	commit: boolean; // true: commit, false: cancel
};

/**
 * Menu property update action - handles real-time preview and commit from ObjectMenu inputs
 */
export type MenuPropertyUpdateAction = {
	type: "MENU_PROPERTY_UPDATE";
	property: string;
	value: string;
	/** true: recorded in history (blur/Enter), false: preview only */
	commit: boolean;
	/**
	 * true: merge this commit with the preceding one for the same property and
	 * selection into a single undo entry (slider key repeat). Ignored when
	 * `commit` is false. Omitted means every commit is its own entry.
	 */
	coalesceHistory?: boolean;
};

/**
 * Paste action - applies clipboard data to canvas state
 */
export type PasteAction = {
	type: "PASTE";
	data: ClipboardData;
};

/**
 * Set doc-creation defaults action - keeps state.docDefaults in sync when the
 * host swaps themes at runtime (e.g. changing the default fontFamily).
 */
export type SetDocDefaultsAction = {
	type: "SET_DOC_DEFAULTS";
	docDefaults: DocCreationDefaults;
};

/**
 * Close context menu action - clears the context menu without any other change.
 * Used by callback menu items (e.g. paste with empty clipboard) that bypass the
 * gesture system and would otherwise leave the menu open.
 */
export type CloseContextMenuAction = {
	type: "CLOSE_CONTEXT_MENU";
};

/**
 * Close modal action - clears the open modal (export dialog / shortcut help).
 * An action rather than a command because ShortcutHelpModal lists the command
 * registry: a "close the modal" command would show up in that list.
 */
export type CloseModalAction = {
	type: "CLOSE_MODAL";
};

/**
 * Union of all canvas actions
 */
export type CanvasAction =
	| GestureAction
	| ContainerResizeAction
	| SyncExternalAction
	| SetViewportAction
	| SetSelectionAction
	| CommandAction
	| UpdateTextEditAction
	| UpdateTextEditSelectionAction
	| ToggleTextFormatAction
	| EndTextEditAction
	| MenuPropertyUpdateAction
	| PasteAction
	| SetDocDefaultsAction
	| CloseContextMenuAction
	| CloseModalAction;
