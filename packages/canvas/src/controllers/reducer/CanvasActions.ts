import type { Dimensions } from "@workspace/geometry";

import type { DocCreationDefaults } from "../../schemas/objects/types/DocCreationDefaults";
import type { CanvasState } from "../../states/canvas/CanvasState";
import type { ClipboardData } from "../commands/selection/ClipboardData";
import type { Gesture } from "../gestures/recognizer/GestureRecognizerTypes";

/**
 * Gesture action - handles user gestures
 */
export type GestureAction = {
	type: "GESTURE";
	gesture: Gesture;
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
	/** Nonce echoed back from the extension. Matches state.saveNonce when this is a fold-back. */
	saveNonce?: string;
};

/**
 * Command action - handles keyboard shortcuts and context menu commands
 */
export type CommandAction = {
	type: "COMMAND";
	commandId: string;
};

/**
 * Update text edit action - updates text during editing
 */
export type UpdateTextEditAction = {
	type: "UPDATE_TEXT_EDIT";
	text: string;
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
 * Union of all canvas actions
 */
export type CanvasAction =
	| GestureAction
	| ContainerResizeAction
	| SyncExternalAction
	| CommandAction
	| UpdateTextEditAction
	| EndTextEditAction
	| MenuPropertyUpdateAction
	| PasteAction
	| SetDocDefaultsAction
	| CloseContextMenuAction;
