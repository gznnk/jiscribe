import type { Point } from "@workspace/geometry";

import { getObjectGestureHandlers } from "./objectHandlers";
import type { GestureContext, ObjectGestureHandlerSet } from "./types";
import type { CanvasState } from "../../states/canvas/CanvasState";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { Gesture } from "../hooks/useGestureRecognizer";

/**
 * Get the kind (canvas/object) from gesture target.
 */
const getKindFromGesture = (gesture: Gesture): string | null => {
	const el = (gesture.target as Element | null)?.closest("[data-kind]");
	return el?.getAttribute("data-kind") ?? null;
};

/**
 * Get the object ID from gesture target.
 */
const getIdFromGesture = (gesture: Gesture): string | null => {
	const el = (gesture.target as Element | null)?.closest("[data-id]");
	return el?.getAttribute("data-id") ?? null;
};

/**
 * Get position from object state if it has cx/cy.
 */
const getObjectPosition = (obj: ObjectState): Point | null => {
	if ("cx" in obj && "cy" in obj) {
		return { x: obj.cx as number, y: obj.cy as number };
	}
	return null;
};

/**
 * Map gesture type to handler method name.
 */
const getHandlerName = (
	gestureType: Gesture["type"],
): keyof ObjectGestureHandlerSet => {
	const map: Record<Gesture["type"], keyof ObjectGestureHandlerSet> = {
		pressed: "onPressed",
		click: "onClick",
		dragStart: "onDragStart",
		drag: "onDrag",
		dragEnd: "onDragEnd",
	};
	return map[gestureType];
};

/**
 * Handle canvas gestures (click to deselect, etc.)
 */
const handleCanvasGesture = (
	state: CanvasState,
	gesture: Gesture,
): CanvasState => {
	switch (gesture.type) {
		case "click":
			return { ...state, selectedIds: [] };
		default:
			return state;
	}
};

/**
 * Handle object gestures (select, drag, etc.)
 */
const handleObjectGesture = (
	state: CanvasState,
	gesture: Gesture,
	objectId: string,
): CanvasState => {
	const obj = state.objects[objectId];
	if (!obj) return state;

	switch (gesture.type) {
		case "click": {
			return { ...state, selectedIds: [objectId] };
		}

		case "dragStart": {
			// Select if not already selected
			const newSelectedIds = state.selectedIds.includes(objectId)
				? state.selectedIds
				: [objectId];

			// Determine which objects to drag
			const targetIds = newSelectedIds.includes(objectId)
				? newSelectedIds
				: [objectId];

			// Store start positions
			const startPositions: Record<string, Point> = {};
			for (const id of targetIds) {
				const targetObj = state.objects[id];
				if (targetObj) {
					const pos = getObjectPosition(targetObj);
					if (pos) {
						startPositions[id] = pos;
					}
				}
			}

			return {
				...state,
				selectedIds: newSelectedIds,
				dragging: { targetIds, startPositions },
			};
		}

		case "drag": {
			if (!state.dragging) return state;

			const { targetIds, startPositions } = state.dragging;
			const newObjects = { ...state.objects };

			for (const id of targetIds) {
				const targetObj = newObjects[id];
				if (!targetObj) continue;

				const startPos = startPositions[id];
				const context: GestureContext = { startPosition: startPos };

				// Get handler for this object type
				const handlers = getObjectGestureHandlers(targetObj.type);
				const handlerName = getHandlerName(gesture.type);
				const handler = handlers?.[handlerName];

				if (handler) {
					const newObj = handler(targetObj, gesture, context);
					if (newObj) {
						newObjects[id] = newObj;
					}
				}
			}

			return { ...state, objects: newObjects };
		}

		case "dragEnd": {
			return { ...state, dragging: null };
		}

		default:
			return state;
	}
};

/**
 * Main gesture handler - pure function that returns new state.
 */
export const handleGesture = (
	state: CanvasState,
	gesture: Gesture,
): CanvasState => {
	const kind = getKindFromGesture(gesture);

	if (kind === "canvas") {
		return handleCanvasGesture(state, gesture);
	}

	if (kind === "object") {
		const objectId = getIdFromGesture(gesture);
		if (objectId) {
			return handleObjectGesture(state, gesture, objectId);
		}
	}

	return state;
};
