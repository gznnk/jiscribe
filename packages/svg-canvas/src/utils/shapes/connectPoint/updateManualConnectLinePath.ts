import type { Diagram } from "../../../types/state/core/Diagram";
import type { ConnectLineState } from "../../../types/state/shapes/ConnectLineState";
import { radiansToDegrees } from "../../math/common/radiansToDegrees";
import { calcRadians } from "../../math/points/calcRadians";
import { isConnectableState } from "../../validation/isConnectableState";

/**
 * Updates a manual connect line path by maintaining the shape's movement behavior.
 * Preserves vertical/horizontal line constraints when applicable and handles endpoint movements.
 *
 * @param connectLine - The connect line to update
 * @param startOwnerFrame - Current start owner frame with updated connect points
 * @param endOwnerFrame - Current end owner frame with updated connect points
 * @param originalConnectLine - Original connect line from start state
 * @param originalStartOwner - Original start owner shape from start state
 * @param originalEndOwner - Original end owner shape from start state
 * @param startPointId - ID of the start connect point
 * @param endPointId - ID of the end connect point
 * @returns Updated connect line with moved points, or null if update is not needed
 */
export const updateManualConnectLinePath = (
	connectLine: ConnectLineState,
	startOwnerFrame: Diagram,
	endOwnerFrame: Diagram,
	originalConnectLine: ConnectLineState,
	originalStartOwner: Diagram,
	originalEndOwner: Diagram,
	startPointId: string,
	endPointId: string,
): ConnectLineState | null => {
	// Check if current owner shapes have connect points
	if (
		!isConnectableState(startOwnerFrame) ||
		!isConnectableState(endOwnerFrame)
	) {
		return null;
	}

	// Find current connect points
	const startConnectPoint = startOwnerFrame.connectPoints.find(
		(cp) => cp.id === startPointId,
	);
	const endConnectPoint = endOwnerFrame.connectPoints.find(
		(cp) => cp.id === endPointId,
	);

	if (!startConnectPoint || !endConnectPoint) {
		return null;
	}

	// Check if original owner shapes have connect points
	if (
		!isConnectableState(originalStartOwner) ||
		!isConnectableState(originalEndOwner)
	) {
		return null;
	}

	// Find original connect points
	const originalStartConnectPoint = originalStartOwner.connectPoints.find(
		(cp) => cp.id === startPointId,
	);
	const originalEndConnectPoint = originalEndOwner.connectPoints.find(
		(cp) => cp.id === endPointId,
	);

	if (!originalStartConnectPoint || !originalEndConnectPoint) {
		return null;
	}

	// Create movement data for endpoints (matches ConnectLine component logic)
	const startMovedData = {
		id: startPointId,
		x: startConnectPoint.x,
		y: startConnectPoint.y,
		moved:
			startConnectPoint.x !== originalStartConnectPoint.x ||
			startConnectPoint.y !== originalStartConnectPoint.y,
	};

	const endMovedData = {
		id: endPointId,
		x: endConnectPoint.x,
		y: endConnectPoint.y,
		moved:
			endConnectPoint.x !== originalEndConnectPoint.x ||
			endConnectPoint.y !== originalEndConnectPoint.y,
	};

	// If neither endpoint moved, skip
	if (!startMovedData.moved && !endMovedData.moved) {
		return null;
	}

	// Use original items for calculations (matches ConnectLine component behavior)
	const originalItems = originalConnectLine.items;

	// Check if all lines are vertical and horizontal only
	const isVerticalHorizontalLines = originalItems.every((item, idx) => {
		if (idx === 0) return true;

		const prev = originalItems[idx - 1];
		const radians = calcRadians(prev.x, prev.y, item.x, item.y);
		const degrees = radiansToDegrees(radians);
		return degrees % 90 === 0;
	});

	// Function to create new point (exact copy of ConnectLine component logic)
	const createNewPoint = (
		movedPoint: typeof startMovedData,
		oldPoint: Diagram,
		idx: number,
	) => {
		// Move end points along with connection point movement
		if (oldPoint.id === movedPoint.id) {
			return {
				...oldPoint,
				x: movedPoint.x,
				y: movedPoint.y,
			};
		}

		// Check if it's a point adjacent to the moved point
		const movedPointIdx = originalItems.findIndex(
			(item) => item.id === movedPoint.id,
		);
		const isNextPoint =
			(movedPointIdx === 0 && idx === 1) ||
			(movedPointIdx === originalItems.length - 1 &&
				idx === originalItems.length - 2);

		if (isNextPoint) {
			// If connection lines are not only vertical and horizontal, keep the second point as is
			if (!isVerticalHorizontalLines) {
				return oldPoint;
			}

			// For connection lines with only vertical and horizontal lines, move the second point to maintain this constraint

			// Calculate movement amount
			const movedPointOldData = originalItems[movedPointIdx];
			const dx = movedPoint.x - movedPointOldData.x;
			const dy = movedPoint.y - movedPointOldData.y;

			// Calculate angle between two points
			const direction = calcRadians(
				movedPointOldData.x,
				movedPointOldData.y,
				oldPoint.x,
				oldPoint.y,
			);
			const degrees = radiansToDegrees(direction);
			const isVertical = (degrees + 405) % 180 > 90;

			// If the line between two points is horizontal, move only x coordinate; if vertical, move only y coordinate
			return {
				...oldPoint,
				x: !isVertical ? oldPoint.x + dx : oldPoint.x,
				y: isVertical ? oldPoint.y + dy : oldPoint.y,
			};
		}

		return oldPoint;
	};

	// Create new items using the same logic as ConnectLine component
	const newItems = originalItems.map((item, idx) => {
		let newPoint = item;

		// Apply start point changes
		if (startMovedData.moved) {
			newPoint = createNewPoint(startMovedData, newPoint, idx);
		}

		// Apply end point changes (if different from start point)
		if (endMovedData.moved && newPoint === item) {
			newPoint = createNewPoint(endMovedData, newPoint, idx);
		}
		return newPoint;
	}) as Diagram[];

	// Return updated connect line with moved points
	return {
		...connectLine,
		items: newItems,
	} as ConnectLineState;
};
