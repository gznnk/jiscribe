import type { SvgCanvasState } from "../../../canvas/types/SvgCanvasState";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { ConnectLineState } from "../../../types/state/shapes/ConnectLineState";
import type { PathPointState } from "../../../types/state/shapes/PathPointState";
import { convertDiagramToFrame } from "../../core/convertDiagramToFrame";
import { getDiagramById } from "../../core/getDiagramById";
import { isConnectableState } from "../../validation/isConnectableState";
import { newId } from "../common/newId";
import { generateOptimalFrameToFrameConnection } from "../connectPoint/generateOptimalFrameToFrameConnection";
import { updateManualConnectLinePath } from "../connectPoint/updateManualConnectLinePath";

/**
 * Updates specific ConnectLines by their IDs.
 * ConnectLines are always at the top level, so no recursive search is needed.
 *
 * @param connectLineIds - Set of ConnectLine IDs to update
 * @param updatingCanvasState - Current canvas state with updated shapes (excluding connect lines)
 * @param startCanvasState - Canvas state at the start of the operation (for autoRouting disabled lines)
 * @returns Updated canvas state with refreshed connect lines
 */
export const updateConnectLinesByIds = (
	connectLineIds: Set<string>,
	updatingCanvasState: SvgCanvasState,
	startCanvasState?: SvgCanvasState,
): SvgCanvasState => {
	if (connectLineIds.size === 0) {
		return updatingCanvasState;
	}

	// Update only the ConnectLines specified by IDs
	const updatedItems = updatingCanvasState.items.map((item) => {
		// Skip if not a ConnectLine or not in the target set
		if (item.type !== "ConnectLine" || !connectLineIds.has(item.id)) {
			return item;
		}

		const connectLine = item as ConnectLineState;

		// Find the start and end owner shapes using getDiagramById for recursive search
		const startOwnerFrame = getDiagramById(
			updatingCanvasState.items,
			connectLine.startOwnerId,
		) as Diagram;
		const endOwnerFrame = getDiagramById(
			updatingCanvasState.items,
			connectLine.endOwnerId,
		) as Diagram;

		// Skip if either owner shape is not found
		if (!startOwnerFrame || !endOwnerFrame) {
			return item;
		}

		// Convert owner shapes to Frames
		const startFrame = convertDiagramToFrame(startOwnerFrame);
		const endFrame = convertDiagramToFrame(endOwnerFrame);

		// Skip if either owner shape cannot be converted to a Frame
		if (!startFrame || !endFrame) {
			return item;
		}

		// Skip if either owner shape doesn't have connect points
		if (
			!isConnectableState(startOwnerFrame) ||
			!isConnectableState(endOwnerFrame)
		) {
			return item;
		}

		// Get the start and end point IDs from the ConnectLine's points array
		const currentPoints = connectLine.points;
		if (currentPoints.length < 2) {
			return item;
		}

		const startPointId = currentPoints[0].id;
		const endPointId = currentPoints[currentPoints.length - 1].id;

		// Find the connect points from the owner shapes using the point IDs
		const startConnectPoint = startOwnerFrame.connectPoints.find(
			(cp) => cp.id === startPointId,
		);
		const endConnectPoint = endOwnerFrame.connectPoints.find(
			(cp) => cp.id === endPointId,
		);

		// Skip if connect points are not found
		if (!startConnectPoint || !endConnectPoint) {
			return item;
		}

		if (connectLine.autoRouting) {
			// Auto-routing enabled: recalculate the optimal path
			const newPath = generateOptimalFrameToFrameConnection(
				startConnectPoint.x,
				startConnectPoint.y,
				startFrame,
				endConnectPoint.x,
				endConnectPoint.y,
				endFrame,
			);

			// Create new path point data
			const newPoints = newPath.map((p, idx) => ({
				id: newId(),
				name: `cp-${idx}`,
				type: "PathPoint",
				geometryType: "point",
				x: p.x,
				y: p.y,
			})) as PathPointState[];

			// Maintain IDs of both end points to preserve connection references
			newPoints[0].id = startPointId;
			newPoints[newPoints.length - 1].id = endPointId;

			// Return updated connect line with new path
			return {
				...connectLine,
				points: newPoints,
			} as ConnectLineState;
		}

		// Auto-routing disabled: maintain manual drag behavior
		if (!startCanvasState) {
			// If no start state provided, skip updating non-auto-routing lines
			return item;
		}

		// Get the original connect line from start state
		const originalConnectLine = getDiagramById(
			startCanvasState.items,
			connectLine.id,
		) as ConnectLineState;

		if (!originalConnectLine) {
			return item;
		}

		// Get original owner shapes from start state
		const originalStartOwner = getDiagramById(
			startCanvasState.items,
			connectLine.startOwnerId,
		);
		const originalEndOwner = getDiagramById(
			startCanvasState.items,
			connectLine.endOwnerId,
		);

		if (!originalStartOwner || !originalEndOwner) {
			return item;
		}

		// Update the manual connect line path using the extracted function
		const updatedConnectLine = updateManualConnectLinePath(
			connectLine,
			startOwnerFrame,
			endOwnerFrame,
			originalConnectLine,
			originalStartOwner,
			originalEndOwner,
			startPointId,
			endPointId,
		);

		return updatedConnectLine || item;
	});

	// Return the updated canvas state with refreshed connect lines
	return {
		...updatingCanvasState,
		items: updatedItems,
	};
};
