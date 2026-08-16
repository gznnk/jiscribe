import type { Point } from "@jiscribe/geometry";

import type { ObjectDocDefinition } from "../../schemas/plugin/ObjectDocDefinition";
import { DocOperationError } from "../errors";

// The vertex list `setPoints` and `addObject` both write, checked and copied here so
// neither op restates the other's rules.

/** Below this no poly type has a shape at all, whatever its own validator asks for. */
const MINIMUM_POLY_POINTS = 2;

/**
 * Check a vertex list against the type meant to hold it, and hand back a copy the doc can own.
 * Shared by `setPoints` and by `addObject`, where `points` replaces the outline the factory
 * would otherwise decide.
 *
 * The count is checked twice over: 2 here, then whatever the type's own `validateDoc` demands
 * (3 for a polygon, which is closed), so the minimum stays in one place — the type — rather
 * than being restated per call site.
 *
 * @param subjectName - What the error messages name: an object's id when it already exists,
 *   the type name when it is about to be created
 * @param points - Vertices in world coordinates, in drawing order; the closing edge of a
 *   polygon is implied, so the first vertex is not repeated at the end
 * @param definition - Definition of the type that is to hold them, whose `features.geometry`
 *   must be "poly"
 * @returns A fresh array of fresh points, so the caller's array is not aliased into the doc
 * @throws {@link DocOperationError} for a non-poly type, a coordinate that is not finite, or
 *   too few vertices
 */
export const requirePolyPoints = (
	subjectName: string,
	points: readonly Point[],
	definition: ObjectDocDefinition,
): Point[] => {
	if (definition.features.geometry !== "poly") {
		throw new DocOperationError(
			`${subjectName} ("${definition.features.type}") is not built from vertices, so points cannot be set on it`,
		);
	}
	const invalidIndex = points.findIndex(
		(point) => !Number.isFinite(point.x) || !Number.isFinite(point.y),
	);
	if (invalidIndex >= 0) {
		throw new DocOperationError(
			`${subjectName}: points[${invalidIndex}] is not a finite coordinate pair`,
		);
	}
	if (points.length < MINIMUM_POLY_POINTS) {
		throw new DocOperationError(
			`${subjectName}: a shape built from vertices needs at least ${MINIMUM_POLY_POINTS} points, got ${points.length}`,
		);
	}

	const copied = points.map(({ x, y }) => ({ x, y }));
	const pointDiagnostics = definition
		.validateDoc({ points: copied }, subjectName)
		.filter((diagnostic) => diagnostic.path.endsWith(".points"));
	if (pointDiagnostics.length > 0) {
		throw new DocOperationError(
			`${subjectName}: ${pointDiagnostics.map((diagnostic) => diagnostic.message).join("; ")}`,
		);
	}
	return copied;
};
