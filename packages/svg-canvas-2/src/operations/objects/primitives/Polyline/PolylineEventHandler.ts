import type { ObjectEventHandler } from "../../../../registry/ObjectRegistryTypes";
import { DefaultClickEventHandler } from "../../utils/DefaultClickEventHandler";
import {
	PolyDragEndEventHandler,
	PolyDragEventHandler,
	PolyDragStartEventHandler,
} from "../../utils/PolyDragEventHandler";

export const PolylineEventHandler: ObjectEventHandler = {
	onDragStart: PolyDragStartEventHandler,
	onDrag: PolyDragEventHandler,
	onDragEnd: PolyDragEndEventHandler,
	onClick: DefaultClickEventHandler,
};
