import type { ObjectEventHandler } from "../../../../registry/ObjectRegistryTypes";
import { DefaultDragEventHandler } from "../../utils/DefaultDragEventHandler";

export const RectEventHandler: ObjectEventHandler = {
	onDragStart: DefaultDragEventHandler,
	onDrag: DefaultDragEventHandler,
	onDragEnd: DefaultDragEventHandler,
};
