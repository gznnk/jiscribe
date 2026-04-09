import { DefaultClickEventHandler } from "../../../../controllers/gestures/handlers/objects/utils/DefaultClickEventHandler";
import {
	PolyDragEndEventHandler,
	PolyDragEventHandler,
	PolyDragStartEventHandler,
} from "../../../../controllers/gestures/handlers/objects/utils/PolyDragEventHandler";
import type { ObjectEventHandler } from "../../../../registry/ObjectRegistryTypes";

export const PolylineEventHandler: ObjectEventHandler = {
	onDragStart: PolyDragStartEventHandler,
	onDrag: PolyDragEventHandler,
	onDragEnd: PolyDragEndEventHandler,
	onClick: DefaultClickEventHandler,
};
