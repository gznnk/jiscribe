import { isStraight } from "./isStraight";
import type { Point } from "../../../types/core/Point";
import { calcManhattanDistance } from "../../math/points/calcManhattanDistance";

export type GridPoint = Point & {
	score?: number;
};

/**
 * Checks if a point matches the midPoint and returns its score.
 *
 * @param point - Point to check
 * @param midPoint - Mid point that provides scoring benefits
 * @returns Score value if point matches midPoint, 0 otherwise
 */
const getMidPointScore = (point: Point, midPoint: GridPoint): number => {
	return point.x === midPoint.x && point.y === midPoint.y
		? midPoint.score || 0
		: 0;
};

/**
 * Selects the optimal path from candidate paths based on distance, turns, and scoring.
 * This function evaluates multiple path candidates and returns the best one by comparing:
 * 1. Total path distance (shorter is better)
 * 2. Number of turns (fewer is better)
 * 3. Score based on optimal waypoints (higher is better)
 *
 * @param candidatePaths - List of candidate paths to evaluate
 * @param startPoint - Start point of the connection
 * @param endPoint - End point of the connection
 * @param optimalMidPoint - Optimal mid point that provides scoring benefits
 * @returns The optimal path from the candidate list
 */
export const selectOptimalPathFromCandidates = (
	candidatePaths: Point[][],
	startPoint: Point,
	endPoint: Point,
	optimalMidPoint: GridPoint,
): Point[] => {
	return candidatePaths.reduce((bestPath, currentPath) => {
		// First, compare distances
		const bestPathDistance = Math.round(
			bestPath.reduce((totalDistance, point, index) => {
				if (index === 0) return totalDistance;
				const previousPoint = bestPath[index - 1];
				return (
					totalDistance +
					calcManhattanDistance(
						previousPoint.x,
						previousPoint.y,
						point.x,
						point.y,
					)
				);
			}, 0),
		);

		const currentPathDistance = Math.round(
			currentPath.reduce((totalDistance, point, index) => {
				if (index === 0) return totalDistance;
				const previousPoint = currentPath[index - 1];
				return (
					totalDistance +
					calcManhattanDistance(
						previousPoint.x,
						previousPoint.y,
						point.x,
						point.y,
					)
				);
			}, 0),
		);

		// If distances are different, return the shorter path
		if (bestPathDistance !== currentPathDistance) {
			return bestPathDistance < currentPathDistance ? bestPath : currentPath;
		}

		// If distances are equal, compare turns
		const fullBestPath = [startPoint].concat(bestPath, endPoint);
		const bestPathTurns = fullBestPath.reduce((totalTurns, point, index) => {
			if (index < 2) return totalTurns;
			return (
				totalTurns +
				(isStraight(fullBestPath[index - 2], fullBestPath[index - 1], point)
					? 0
					: 1)
			);
		}, 0);

		const fullCurrentPath = [startPoint].concat(currentPath, endPoint);
		const currentPathTurns = fullCurrentPath.reduce(
			(totalTurns, point, index) => {
				if (index < 2) return totalTurns;
				return (
					totalTurns +
					(isStraight(
						fullCurrentPath[index - 2],
						fullCurrentPath[index - 1],
						point,
					)
						? 0
						: 1)
				);
			},
			0,
		);

		// If turns are different, return the path with fewer turns
		if (bestPathTurns !== currentPathTurns) {
			return bestPathTurns < currentPathTurns ? bestPath : currentPath;
		}

		// If both distance and turns are equal, compare scores
		const bestPathScore = bestPath.reduce(
			(totalScore, point) =>
				totalScore + getMidPointScore(point, optimalMidPoint),
			0,
		);

		const currentPathScore = currentPath.reduce(
			(totalScore, point) =>
				totalScore + getMidPointScore(point, optimalMidPoint),
			0,
		);

		// Return the path with higher score
		return bestPathScore > currentPathScore ? bestPath : currentPath;
	});
};
