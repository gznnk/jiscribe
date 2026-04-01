import type { ObjectEventHandler } from "../../../../registry/ObjectRegistryTypes";
import { DefaultClickEventHandler } from "../../utils/handlers/DefaultClickEventHandler";
import {
	FrameDragEndEventHandler,
	FrameDragEventHandler,
	FrameDragStartEventHandler,
} from "../../utils/handlers/FrameDragEventHandler";

export const EllipseEventHandler: ObjectEventHandler = {
	onDragStart: FrameDragStartEventHandler,
	onDrag: FrameDragEventHandler,
	onDragEnd: FrameDragEndEventHandler,
	onClick: DefaultClickEventHandler,
};
