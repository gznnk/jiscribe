import { DiagramRegistry } from "../../registry";
import type { Diagram } from "../../types/state/core/Diagram";
import { isConnectableState } from "../../utils/validation/isConnectableState";

/**
 * Update the connect points of a diagram item.
 * @param item Diagram item to update connect points for.
 * @returns Updated diagram item with new connect points.
 */
export const updateDiagramConnectPoints = (item: Diagram): Diagram => {
	if (
		isConnectableState(item) &&
		item.connectEnabled &&
		0 < item.connectPoints.length
	) {
		const calculator = DiagramRegistry.getConnectPointCalculator(item.type);
		if (calculator) {
			return {
				...item,
				connectPoints: calculator(item),
			} as Diagram;
		}
	}
	return item;
};
