import { DiagramRegistry } from "../../registry";
import type { DiagramData } from "../../types/data/core/DiagramData";
import type { Diagram } from "../../types/state/core/Diagram";

/**
 * Converts a single DiagramData to Diagram (state format).
 * Uses the registry to find the appropriate mapper function.
 *
 * @param data - Source DiagramData
 * @returns Diagram object in state format
 */
export const mapDiagramDataToState = (data: DiagramData): Diagram => {
	const dataToStateMapper = DiagramRegistry.getDataToStateMapper(data.type);
	if (dataToStateMapper) {
		return dataToStateMapper(data);
	}
	// Fallback: return the item as is if no mapper is found
	return data as Diagram;
};
