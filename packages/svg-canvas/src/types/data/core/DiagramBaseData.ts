import type { DiagramType } from "../../core/DiagramType";

/**
 * Base data structure for all diagram elements.
 * Provides common properties that all diagram types must implement.
 */
export type DiagramBaseData = {
	id: string;
	type: DiagramType;
	x: number;
	y: number;
	name?: string;
	description?: string;
};
