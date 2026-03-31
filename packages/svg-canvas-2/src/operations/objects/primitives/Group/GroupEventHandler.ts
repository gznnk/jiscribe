import type { ObjectEventHandler } from "../../../../registry/ObjectRegistryTypes";
import {
	FrameDragEndEventHandler,
	FrameDragEventHandler,
	FrameDragStartEventHandler,
} from "../../utils/FrameDragEventHandler";

/**
 * Event handler for Group objects.
 * Note: Group itself doesn't render clickable SVG elements, so onClick is undefined.
 * Child objects within the group handle their own click events.
 */
export const GroupEventHandler: ObjectEventHandler = {
	onDragStart: FrameDragStartEventHandler,
	onDrag: FrameDragEventHandler,
	onDragEnd: FrameDragEndEventHandler,
	onClick: undefined, // Group is not clickable (no SVG element rendered)
};
