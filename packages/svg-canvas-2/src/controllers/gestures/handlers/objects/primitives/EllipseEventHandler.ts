import type { ObjectEventHandler } from "../../../../../registry/ObjectRegistryTypes";
import { DefaultClickEventHandler } from "../utils/DefaultClickEventHandler";
import {
	FrameDragEndEventHandler,
	FrameDragEventHandler,
	FrameDragStartEventHandler,
} from "../utils/FrameDragEventHandler";

export const EllipseEventHandler: ObjectEventHandler = {
	onDragStart: FrameDragStartEventHandler,
	onDrag: FrameDragEventHandler,
	onDragEnd: FrameDragEndEventHandler,
	onClick: DefaultClickEventHandler,
};
