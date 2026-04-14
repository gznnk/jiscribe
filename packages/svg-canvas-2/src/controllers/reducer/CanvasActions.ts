import type { Dimensions } from "@workspace/geometry";

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
 * Union of all canvas actions
 */
export type CanvasAction =
	| GestureAction
	| ContainerResizeAction
	| SyncExternalAction
	| CommandAction
	| StartTextEditAction
	| UpdateTextEditAction
	| EndTextEditAction;
