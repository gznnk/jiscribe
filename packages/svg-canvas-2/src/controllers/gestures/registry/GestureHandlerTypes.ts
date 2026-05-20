import type { Prettify } from "@workspace/utility-types/src/Prettify";

import type { CanvasControllerState } from "../../CanvasTypes";
import type {
	Gesture,
	GestureType,
} from "../recognizer/GestureRecognizerTypes";

/**
 * Canvas event type.
 * Excludes "wheel" from GestureType (wheel is converted to scroll/zoom).
 * Adds canvas-specific events like dragOver, dragLeave, scroll, and zoom.
 */
export type EventType =
	| Exclude<GestureType, "wheel">
	| "dragOver"
	| "dragLeave"
	| "scroll"
	| "zoom";

/**
 * Canvas event type.
 * Represents high-level user intentions (scroll, zoom, drag, click, etc.)
 * derived from low-level input gestures.
 */
export type CanvasEvent = Prettify<
	{
		type: EventType;
	} & Omit<Gesture, "type">
>;

/**
 * Interface for gesture handlers.
 * Handlers can determine if they support a canvas event and process it accordingly.
 */
export interface GestureHandler {
	/**
	 * Determines if this handler supports the given canvas event.
	 * @param event - The canvas event to check
	 * @returns true if this handler can process the event
	 */
	supports(event: CanvasEvent): boolean;

	/**
	 * Handles the canvas event and returns the updated canvas controller state.
	 * @param state - The current canvas controller state
	 * @param event - The canvas event to process
	 * @returns The updated canvas controller state
	 */
	handle(
		state: CanvasControllerState,
		event: CanvasEvent,
	): CanvasControllerState;
}
