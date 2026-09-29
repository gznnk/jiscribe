import type { SemanticDiagnostic } from "../../types/SemanticDiagnostic";
import { isPoly } from "../types/Poly";

/**
 * Validate a `points` array: it must be a valid poly and have at least `minPoints` points.
 * Used for polyline/polygon shapes that require endpoint coordinates in their points array.
 */
export function validatePolyFields(
	o: Record<string, unknown>,
	path: string,
	minPoints = 2,
): SemanticDiagnostic[] {
	if (!isPoly(o)) {
		return [
			{
				path: `${path}.points`,
				message: "must be a valid points array",
				severity: "error",
			},
		];
	}
	if (o.points.length < minPoints) {
		return [
			{
				path: `${path}.points`,
				message: `must have at least ${minPoints} points`,
				severity: "error",
			},
		];
	}
	return [];
}

/**
 * Validate a connector's points (intermediate waypoints).
 * Since endpoint coordinates are held by the source/target EndpointRef, an empty array
 * (= a straight connector) is allowed, unlike polyline/polygon. `points` is optional and
 * defaults to an empty array, so an absent key is also valid; only a present-but-malformed
 * value is an error.
 */
export function validateWaypointFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	if (!("points" in o) || o.points === undefined) {
		return [];
	}
	if (!isPoly(o)) {
		return [
			{
				path: `${path}.points`,
				message: "must be a valid points array",
				severity: "error",
			},
		];
	}
	return [];
}
