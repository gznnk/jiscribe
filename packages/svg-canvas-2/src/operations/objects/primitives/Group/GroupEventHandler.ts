import type { ObjectEventHandler } from "../../../../registry/ObjectRegistryTypes";
import { DefaultDragEventHandler } from "../../utils/DefaultDragEventHandler";

export const GroupEventHandler: ObjectEventHandler = {
	onDragStart: DefaultDragEventHandler,
	onDrag: DefaultDragEventHandler,
	onDragEnd: DefaultDragEventHandler,
};
