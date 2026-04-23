import type { Dimensions } from "@workspace/geometry";

import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import type { CanvasState } from "../../states/canvas/CanvasState";
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
};

/**
 * Command action - handles keyboard shortcuts and context menu commands
 */
export type CommandAction = {
	type: "COMMAND";
	commandId: string;
};

/**
 * Start text edit action - begins editing text in an object
 */
export type StartTextEditAction = {
	type: "START_TEXT_EDIT";
	objectId: string;
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
	commit: boolean; // true: 確定, false: キャンセル
};

/**
 * Undo action - restores previous state from history
 */
export type UndoAction = {
	type: "UNDO";
	doc: CanvasDoc; // 復元するドキュメント
};

/**
 * Redo action - restores next state from history
 */
export type RedoAction = {
	type: "REDO";
	doc: CanvasDoc; // 復元するドキュメント
};

/**
 * Menu property update action - handles real-time preview and commit from ObjectMenu inputs
 */
export type MenuPropertyUpdateAction = {
	type: "MENU_PROPERTY_UPDATE";
	property: string;
	value: string;
	/** true: 履歴記録あり（blur/Enter）、false: プレビューのみ */
	commit: boolean;
};

/**
 * Union of all canvas actions
 */
export type CanvasAction =
	| GestureAction
	| ContainerResizeAction
	| SyncExternalAction
	| CommandAction
	| StartTextEditAction
	| UpdateTextEditAction
	| EndTextEditAction
	| UndoAction
	| RedoAction
	| MenuPropertyUpdateAction;
