import type { Point } from "@workspace/geometry";

import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { Gesture } from "../useGestureRecognizer";

/**
 * Context passed to object gesture handlers.
 */
export type GestureContext = {
	/** Start position of the object when drag started */
	startPosition?: Point;
};

/**
 * Handler for a specific gesture type on an object.
 * Returns a new object state, or null if no change.
 */
export type ObjectGestureHandler<T extends ObjectState = ObjectState> = (
	obj: T,
	gesture: Gesture,
	context: GestureContext,
) => T | null;

/**
 * Set of gesture handlers for an object type.
 */
export type ObjectGestureHandlerSet<T extends ObjectState = ObjectState> = {
	onPressed?: ObjectGestureHandler<T>;
	onClick?: ObjectGestureHandler<T>;
	onDragStart?: ObjectGestureHandler<T>;
	onDrag?: ObjectGestureHandler<T>;
	onDragEnd?: ObjectGestureHandler<T>;
};
