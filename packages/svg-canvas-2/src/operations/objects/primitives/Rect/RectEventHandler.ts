import type { ObjectEventHandler } from "../../../../registry/ObjectRegistryTypes";
import {
	DefaultDragEventHandler,
	DefaultDragStartEventHandler,
} from "../../utils/DefaultDragEventHandler";

export const RectEventHandler: ObjectEventHandler = {
	onDragStart: DefaultDragStartEventHandler,
	onDrag: DefaultDragEventHandler,
	onDragEnd: DefaultDragEventHandler,
};
