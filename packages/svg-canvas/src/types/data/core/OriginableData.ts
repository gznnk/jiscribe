/**
 * Interface for diagram elements that have origin points for child placement.
 * Used for containers that need to position child elements at specific coordinates.
 */
export type OriginableData = {
	/**
	 * Origin X coordinate for placing child diagrams.
	 */
	originX: number;
	/**
	 * Origin Y coordinate for placing child diagrams.
	 */
	originY: number;
};
