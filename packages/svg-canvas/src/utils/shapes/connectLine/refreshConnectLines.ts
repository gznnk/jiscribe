import { collectConnectedConnectLines } from "./collectConnectedConnectLines";
import { updateConnectLinesByIds } from "./updateConnectLinesByIds";
import type { SvgCanvasState } from "../../../canvas/types/SvgCanvasState";
import type { Diagram } from "../../../types/state/core/Diagram";

/**
 * Updates connection lines that are connected to the given updated diagrams.
 * Updates both autoRouting enabled and disabled connection lines.
 *
 * @param updatedDiagrams - Array of diagrams that have been updated/transformed
 * @param updatingCanvasState - Current canvas state with updated shapes (excluding connect lines)
 * @param startCanvasState - Canvas state at the start of the operation (for autoRouting disabled lines)
 * @returns Updated canvas state with refreshed connect lines
 */
export const refreshConnectLines = (
	updatedDiagrams: Diagram[],
	updatingCanvasState: SvgCanvasState,
	startCanvasState?: SvgCanvasState,
): SvgCanvasState => {
	// Collect diagram IDs from updated diagrams
	const updatedDiagramIds = new Set(updatedDiagrams.map((d) => d.id));

	// Collect ConnectLine IDs that are connected to the updated diagrams
	const connectLineIds = collectConnectedConnectLines(
		updatingCanvasState.items,
		updatedDiagramIds,
	);

	// Update the collected ConnectLines
	return updateConnectLinesByIds(
		connectLineIds,
		updatingCanvasState,
		startCanvasState,
	);
};
