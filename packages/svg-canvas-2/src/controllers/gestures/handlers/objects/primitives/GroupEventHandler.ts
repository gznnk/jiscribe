import type { ObjectEventHandler } from "../../../../../registry/ObjectRegistryTypes";

/**
 * Event handler for Group objects.
 * Note: Group itself doesn't render any SVG elements, so no pointer events can
 * target a Group directly. All handlers are undefined.
 * - Drag: handled by child objects' FrameDragEventHandler (loops over selectedIds)
 * - Click: handled by child objects
 */
export const GroupEventHandler: ObjectEventHandler = {
	onDragStart: undefined, // Group has no DOM element; drag is handled via child objects
	onDrag: undefined, // Group has no DOM element; drag is handled via child objects
	onDragEnd: undefined, // Group has no DOM element; drag is handled via child objects
	onClick: undefined, // Group has no DOM element; click is handled via child objects
};
