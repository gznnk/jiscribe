import { isFrame, type Point } from "@workspace/geometry";

import type { DragEventHandler } from "../../../registry/ObjectRegistryTypes";
import type { CanvasState } from "../../../states/canvas/CanvasState";
import type { ObjectState } from "../../../states/objects/base/ObjectState";

/**
 * Default drag event handler that updates an object's position.
 * Returns the entire CanvasState with the updated object.
 */
export const DefaultDragEventHandler: DragEventHandler<ObjectState> = (
	delta: Point,
	objectState: ObjectState,
	canvasState: CanvasState,
) => {
	if (!isFrame(objectState)) {
		return canvasState;
	}
	const { cx, cy, id } = objectState;
	const updatedObjectState = {
		...objectState,
		cx: cx + delta.x,
		cy: cy + delta.y,
	};

	// Update the object in the canvas state
	return {
		...canvasState,
		objects: {
			...canvasState.objects,
			[id]: updatedObjectState,
		},
	};
};
