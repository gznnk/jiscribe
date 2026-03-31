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
 * Union of all canvas actions
 */
export type CanvasAction =
	| GestureAction
	| ContainerResizeAction
	| SyncExternalAction
	| CommandAction;
