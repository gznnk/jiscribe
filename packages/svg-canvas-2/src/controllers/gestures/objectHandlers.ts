import type { ObjectGestureHandlerSet } from "./types";
import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * Default handler for objects with cx/cy position.
 * Used by rect, ellipse, and other positioned objects.
 */
const positionedObjectHandler: ObjectGestureHandlerSet = {
	onDrag: (obj, gesture, context) => {
		if (!context.startPosition) return null;
		if (!("cx" in obj) || !("cy" in obj)) return null;

		return {
			...obj,
			cx: context.startPosition.x + gesture.delta.x,
			cy: context.startPosition.y + gesture.delta.y,
		} as ObjectState;
	},
};

/**
 * Registry of gesture handlers by object type.
 */
const objectGestureHandlers: Record<string, ObjectGestureHandlerSet> = {
	rect: positionedObjectHandler,
	ellipse: positionedObjectHandler,
};

/**
 * Get gesture handler set for an object type.
 */
export const getObjectGestureHandlers = (
	type: string,
): ObjectGestureHandlerSet | undefined => {
	return objectGestureHandlers[type];
};

/**
 * Register a gesture handler set for an object type.
 */
export const registerObjectGestureHandlers = (
	type: string,
	handlers: ObjectGestureHandlerSet,
): void => {
	objectGestureHandlers[type] = handlers;
};
