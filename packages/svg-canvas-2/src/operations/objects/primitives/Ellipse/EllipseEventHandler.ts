import type { ObjectEventHandler } from "../../../../registry/ObjectRegistryTypes";
import { DefaultDragEventHandler } from "../../utils/DefaultDragEventHandler";

export const EllipseEventHandler: ObjectEventHandler = {
	onDragStart: DefaultDragEventHandler,
	onDrag: DefaultDragEventHandler,
	onDragEnd: DefaultDragEventHandler,
};
