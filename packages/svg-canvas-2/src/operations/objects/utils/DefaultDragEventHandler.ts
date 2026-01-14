import { isFrame, type Point } from "@workspace/geometry";

import type { DragEventHandler } from "../../../registry/ObjectRegistryTypes";
import type { CanvasState } from "../../../states/canvas/CanvasState";
import type { ObjectState } from "../../../states/objects/base/ObjectState";

export const DefaultDragEventHandler: DragEventHandler<ObjectState> = (
	delta: Point,
	objectState: ObjectState,
	_canvasState: CanvasState,
) => {
	if (!isFrame(objectState)) {
		return objectState;
	}
	const { cx, cy } = objectState;
	return {
		...objectState,
		cx: cx + delta.x,
		cy: cy + delta.y,
	};
};
