import type { DiagramClickEvent } from "../../events/DiagramClickEvent";
import type { DiagramDragDropEvent } from "../../events/DiagramDragDropEvent";
import type { DiagramDragEvent } from "../../events/DiagramDragEvent";
import type { DiagramHoverChangeEvent } from "../../events/DiagramHoverChangeEvent";

/**
 * Base properties for diagram components.
 * Defines common event handlers and appearance settings shared by all diagram elements.
 */
export type DiagramBaseProps = {
	onDrag?: (e: DiagramDragEvent) => void;
	onDrop?: (e: DiagramDragDropEvent) => void;
	onDragOver?: (e: DiagramDragDropEvent) => void;
	onDragLeave?: (e: DiagramDragDropEvent) => void;
	onClick?: (e: DiagramClickEvent) => void;
	onHoverChange?: (e: DiagramHoverChangeEvent) => void;
};
