import type { Diagram } from "../../../types/state/core/Diagram";
import type { ConnectLineState } from "../../../types/state/shapes/ConnectLineState";

/**
 * Collects all ConnectLines that are connected to the specified diagrams.
 * ConnectLines are always at the top level of the items array.
 *
 * @param items - Top level diagrams array
 * @param diagramIds - Set of diagram IDs to check connections for
 * @returns Set of ConnectLine IDs that are connected to any of the specified diagrams
 */
export const collectConnectedConnectLines = (
	items: Diagram[],
	diagramIds: Set<string>,
): Set<string> => {
	const connectLineIds = new Set<string>();

	// Find ConnectLines at top level that connect to any of the target diagrams
	for (const item of items) {
		if (item.type === "ConnectLine") {
			const connectLine = item as ConnectLineState;

			// Check if either end is connected to one of the target diagrams
			if (
				diagramIds.has(connectLine.startOwnerId) ||
				diagramIds.has(connectLine.endOwnerId)
			) {
				connectLineIds.add(connectLine.id);
			}
		}
	}

	return connectLineIds;
};
