import { DefaultClickEventHandler } from "../../../../controllers/gestures/handlers/objects/utils/DefaultClickEventHandler";
import {
	FrameDragEndEventHandler,
	FrameDragEventHandler,
	FrameDragStartEventHandler,
} from "../../../../controllers/gestures/handlers/objects/utils/FrameDragEventHandler";
import type { ObjectEventHandler } from "../../../../registry/ObjectRegistryTypes";

export const RectEventHandler: ObjectEventHandler = {
	onDragStart: FrameDragStartEventHandler,
	onDrag: FrameDragEventHandler,
	onDragEnd: FrameDragEndEventHandler,
	onClick: DefaultClickEventHandler,
};
