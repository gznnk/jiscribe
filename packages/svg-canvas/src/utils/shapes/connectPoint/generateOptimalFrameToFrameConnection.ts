import { addMarginToBoxGeometry } from "./addMarginToBoxGeometry";
import { cleanPath } from "./cleanPath";
import { generatePathFromFrameToPoint } from "./generatePathFromFrameToPoint";
import { getLineDirection } from "./getLineDirection";
import { getSecondConnectPoint } from "./getSecondConnectPoint";
import { removeDuplicatePoints } from "./removeDuplicatePoints";
import { selectOptimalPathFromCandidates } from "./selectOptimalPathFromCandidates";
import type { Frame } from "../../../types/core/Frame";
import type { Point } from "../../../types/core/Point";
import { closer } from "../../math/common/closer";
import { calcRectangleBoundingBoxGeometry } from "../../math/geometry/calcRectangleBoundingBoxGeometry";
import { isLineIntersectingBoxGeometry } from "../../math/geometry/isLineIntersectingBoxGeometry";

/**
 * Adds a candidate point to the collection and generates intersection points
 * with existing candidate points to create a grid of routing options.
 *
 * @param candidatePoints - The collection of candidate points to add to
 * @param point - The point to add to the collection
 */
const addCandidatePointWithIntersections = (
	candidatePoints: Point[],
	point: Point,
): void => {
	// Check if point already exists to avoid duplicates
	if (!candidatePoints.some((p) => p.x === point.x && p.y === point.y)) {
		const currentLength = candidatePoints.length;

		// Create intersection points with existing candidates
		for (let i = 0; i < currentLength; i++) {
			const existingPoint = candidatePoints[i];

			// Add horizontal intersection point (same y as new point, x from existing)
			if (existingPoint.x !== point.x) {
				candidatePoints.push({ x: existingPoint.x, y: point.y });
			}

			// Add vertical intersection point (same x as new point, y from existing)
			if (existingPoint.y !== point.y) {
				candidatePoints.push({ x: point.x, y: existingPoint.y });
			}
		}

		// Add the original point
		candidatePoints.push(point);
	}
};

/**
 * Generates optimal connection path between two shapes with automatic routing.
 * This function analyzes multiple routing options and selects the best path that
 * avoids shape intersections and provides the shortest, cleanest connection.
 *
 * @param startX - Start point x coordinate on the first shape
 * @param startY - Start point y coordinate on the first shape
 * @param startOwnerShape - First shape in the connection
 * @param endX - End point x coordinate on the second shape
 * @param endY - End point y coordinate on the second shape
 * @param endOwnerShape - Second shape in the connection
 * @returns Array of points representing the optimal frame-to-frame connection path
 */
export const generateOptimalFrameToFrameConnection = (
	startX: number,
	startY: number,
	startOwnerFrame: Frame,
	endX: number,
	endY: number,
	endOwnerFrame: Frame,
): Point[] => {
	// Calculate the direction from shape center to connection point
	// This determines which side of the shape the connection starts/ends
	const startDirection = getLineDirection(
		startOwnerFrame.x,
		startOwnerFrame.y,
		startX,
		startY,
	);
	const endDirection = getLineDirection(
		endOwnerFrame.x,
		endOwnerFrame.y,
		endX,
		endY,
	);

	// Get bounding box geometries for both frames to calculate connection points
	const startFrameBounds = calcRectangleBoundingBoxGeometry(startOwnerFrame);
	const endFrameBounds = calcRectangleBoundingBoxGeometry(endOwnerFrame);

	// Calculate secondary connection points that extend from the frame edges
	// These points help create cleaner connection paths that avoid overlapping with frames
	const startSecondaryPoint = getSecondConnectPoint(
		startOwnerFrame,
		startFrameBounds,
		startX,
		startY,
	);
	const endSecondaryPoint = getSecondConnectPoint(
		endOwnerFrame,
		endFrameBounds,
		endX,
		endY,
	);

	// Calculate midpoint between secondary points to determine path routing area
	const secondaryMidX = (startSecondaryPoint.x + endSecondaryPoint.x) / 2;
	const secondaryMidY = (startSecondaryPoint.y + endSecondaryPoint.y) / 2;

	// Find the closest edge coordinates to the midpoint for each shape
	// This helps determine optimal intermediate routing points
	const startCloserX = closer(
		secondaryMidX,
		startFrameBounds.left,
		startFrameBounds.right,
	);
	const startCloserY = closer(
		secondaryMidY,
		startFrameBounds.top,
		startFrameBounds.bottom,
	);
	const endCloserX = closer(
		secondaryMidX,
		endFrameBounds.left,
		endFrameBounds.right,
	);
	const endCloserY = closer(
		secondaryMidY,
		endFrameBounds.top,
		endFrameBounds.bottom,
	);

	// Calculate optimal intermediate point for connection routing
	const optimalMidPoint = {
		x: Math.round((startCloserX + endCloserX) / 2),
		y: Math.round((startCloserY + endCloserY) / 2),
		score: 1,
	};

	// Create grid of candidate center points for connection lines
	// This grid helps find the best intermediate routing points
	const candidatePoints: Point[] = [];
	addCandidatePointWithIntersections(candidatePoints, startSecondaryPoint);
	addCandidatePointWithIntersections(candidatePoints, endSecondaryPoint);
	addCandidatePointWithIntersections(candidatePoints, optimalMidPoint);

	// Create routes passing through each center candidate point
	const nonIntersectingPaths: Point[][] = [];
	const intersectingPaths: Point[][] = [];

	// Add margin to shape bounds to prevent paths from getting too close to shapes
	const startShapeWithMargin = addMarginToBoxGeometry(startFrameBounds);
	const endShapeWithMargin = addMarginToBoxGeometry(endFrameBounds);

	for (const candidatePoint of candidatePoints) {
		// Route from connection source to center candidate
		const startToCenter = generatePathFromFrameToPoint(
			startX,
			startY,
			startDirection,
			startFrameBounds,
			candidatePoint.x,
			candidatePoint.y,
		);

		// Route from connection destination to center candidate
		const endToCenter = generatePathFromFrameToPoint(
			endX,
			endY,
			endDirection,
			endFrameBounds,
			candidatePoint.x,
			candidatePoint.y,
		);

		// Combine start-to-center and center-to-end paths
		const fullConnectionPath = [...startToCenter, ...endToCenter.reverse()];

		// Check if the path intersects with either shape (excluding connection points)
		// This helps prioritize paths that don't pass through shapes
		const isPathIntersectingShapes = () => {
			for (let i = 1; i < fullConnectionPath.length - 2; i++) {
				const pathPoint1 = fullConnectionPath[i];
				const pathPoint2 = fullConnectionPath[i + 1];
				if (
					isLineIntersectingBoxGeometry(
						pathPoint1,
						pathPoint2,
						startShapeWithMargin,
					) ||
					isLineIntersectingBoxGeometry(
						pathPoint1,
						pathPoint2,
						endShapeWithMargin,
					)
				) {
					return true;
				}
			}
			return false;
		};

		// Remove duplicate points to clean up the path
		const cleanedPath = removeDuplicatePoints(fullConnectionPath);

		// Sort paths into non-intersecting (preferred) and intersecting categories
		if (!isPathIntersectingShapes()) {
			nonIntersectingPaths.push(cleanedPath);
		} else {
			intersectingPaths.push(cleanedPath);
		}
	}

	// Define start and end points for path evaluation
	const startPoint = { x: startX, y: startY };
	const endPoint = { x: endX, y: endY };

	// Select the best path: prefer non-intersecting paths, fall back to intersecting ones
	// if no clean path is available
	const bestPath =
		nonIntersectingPaths.length !== 0
			? selectOptimalPathFromCandidates(
					nonIntersectingPaths,
					startPoint,
					endPoint,
					optimalMidPoint,
				)
			: selectOptimalPathFromCandidates(
					intersectingPaths,
					startPoint,
					endPoint,
					optimalMidPoint,
				);

	// Final cleanup to remove any remaining redundant points
	return cleanPath(bestPath);
};
