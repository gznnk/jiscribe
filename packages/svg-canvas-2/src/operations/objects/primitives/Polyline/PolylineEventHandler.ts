import type { ObjectEventHandler } from "../../../../registry/ObjectRegistryTypes";
import { DefaultClickEventHandler } from "../../utils/handlers/DefaultClickEventHandler";
import {
	PolyDragEndEventHandler,
	PolyDragEventHandler,
	PolyDragStartEventHandler,
} from "../../utils/handlers/PolyDragEventHandler";

export const PolylineEventHandler: ObjectEventHandler = {
	onDragStart: PolyDragStartEventHandler,
	onDrag: PolyDragEventHandler,
	onDragEnd: PolyDragEndEventHandler,
	onClick: DefaultClickEventHandler,
};
