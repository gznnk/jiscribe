import type { ObjectEventHandler } from "../../../../registry/ObjectRegistryTypes";
import { DefaultClickEventHandler } from "../../utils/DefaultClickEventHandler";
import {
	DefaultDragEventHandler,
	DefaultDragStartEventHandler,
} from "../../utils/DefaultDragEventHandler";

export const EllipseEventHandler: ObjectEventHandler = {
	onDragStart: DefaultDragStartEventHandler,
	onDrag: DefaultDragEventHandler,
	onDragEnd: DefaultDragEventHandler,
	onClick: DefaultClickEventHandler,
};
