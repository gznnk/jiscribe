import type { GeometryType } from "../../core/GeometryType";
import type { DiagramBaseData } from "../../data/core/DiagramBaseData";

/**
 * Base state structure for all diagram elements.
 * Extends base data with runtime state that should not be persisted.
 */
export type DiagramBaseState = DiagramBaseData & {
	geometryType: GeometryType;
	isTransparent?: boolean;
	isDragging?: boolean;
	isInDragTriggeredTree?: boolean;
};
