import type { Point } from "@jiscribe/geometry";

import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import { DocOperationError } from "../errors";
import { batchItemError } from "../utils/batchErrors";
import {
	type ObjectRecord,
	requireObject,
	requireObjects,
} from "../utils/objectAccess";
import {
	type DocDefinitions,
	isConnectorObject,
} from "../utils/objectGeometry";
import { requirePolyPoints } from "../utils/polyFields";
import {
	applyRotation,
	requireRotationDegrees,
} from "../utils/transformFields";

/** A poly shape cleared for reshaping, with the vertex list the doc is to own. */
type PointsPlan = { object: ObjectRecord; points: Point[] };

/** Resolve one shape and check the vertices meant for it, writing nothing. */
const planPoints = (
	doc: CanvasDoc,
	id: string,
	points: readonly Point[],
	definitions: DocDefinitions,
): PointsPlan => {
	const { object } = requireObject(doc, id);
	if (isConnectorObject(object)) {
		throw new DocOperationError(
			`${id} is a connector: its points are the route's waypoints, so change them with updateConnector`,
		);
	}
	const definition = definitions.get(object.type);
	if (definition === undefined) {
		throw new DocOperationError(
			`${id} has unknown object type "${object.type}", so its vertices cannot be checked`,
		);
	}
	return { object, points: requirePolyPoints(id, points, definition) };
};

/**
 * Replace the vertices of one poly shape, mutating `doc` in place.
 *
 * The whole outline is given at once — there is no way to nudge a single vertex — so the
 * shape moves and resizes with it: a poly shape has no `x`/`y`/`width`/`height` of its own,
 * and its bounding box is whatever the vertices span.
 *
 * @param doc - Mutated in place
 * @param id - Id of the shape to reshape; must exist and be a polygon or a polyline
 * @param points - Vertices in world coordinates (the same space `addObject`'s `x`/`y` are in),
 *   in drawing order; at least 2, and at least 3 for a polygon
 * @param definitions - Type table `features.geometry` is read from
 * @throws {@link DocOperationError} when the id is missing, when it names a connector — whose
 *   `points` are route waypoints, so `updateConnector` owns them — when the type is not built
 *   from vertices, or when the vertices are too few or not finite
 */
export const setPoints = (
	doc: CanvasDoc,
	id: string,
	points: readonly Point[],
	definitions: DocDefinitions,
): void => {
	const plan = planPoints(doc, id, points, definitions);
	plan.object.points = plan.points;
};

/** One shape's new vertices in a {@link setPointsMany} call. */
export type SetPointsEntry = { id: string; points: readonly Point[] };

/**
 * Replace the vertices of several poly shapes, mutating `doc` in place.
 *
 * Each shape gets an outline of its own, and takes the position and size those vertices span
 * — a poly shape has no `x`/`y`/`width`/`height` to keep. The name is `setPointsMany` rather
 * than `setPoints` because the singular op already owns that name.
 *
 * @param doc - Mutated in place
 * @param entries - Vertices per shape, applied in the order given, each list in world
 *   coordinates and drawing order; a repeated id ends up with its last entry's outline
 * @param definitions - Type table `features.geometry` is read from
 * @throws {@link DocOperationError} before touching the doc, identified as `entries[i] (id)`:
 *   when an id is missing, names a connector — whose `points` are route waypoints, so
 *   `updateConnector` owns them — names a type not built from vertices, or comes with too
 *   few or non-finite vertices
 */
export const setPointsMany = (
	doc: CanvasDoc,
	entries: readonly SetPointsEntry[],
	definitions: DocDefinitions,
): void => {
	// Check every outline first: a mid-way failure would leave half the batch reshaped.
	const plans = entries.map(({ id, points }, index) => {
		try {
			return planPoints(doc, id, points, definitions);
		} catch (error) {
			throw batchItemError("entries", index, id, error);
		}
	});
	for (const { object, points } of plans) {
		object.points = points;
	}
};

export type SetRotationResult = {
	/** Ids whose object took the angle. */
	rotatedIds: string[];
	/** Ids left as they were, their type having no rotation of its own. */
	ignoredIds: string[];
};

/**
 * Turn several objects to the same angle, mutating `doc` in place.
 *
 * The shape turns about its own centre and keeps that centre, so a rotated object still
 * measures the same untransformed bounding box to `getCombinedBounds` and still moves by the
 * placement ops. A type that cannot be turned is skipped rather than written, the way
 * {@link import("./style").setStyle} skips a property a type has no place for, and every
 * such id is reported.
 *
 * @param doc - Mutated in place
 * @param ids - Ids to turn; all must exist in the root tree, and a duplicate id is reported twice
 * @param rotation - Clockwise degrees on screen, where y grows downwards; normalized to
 *   [0, 360), so -90 and 270 are the same angle and 0 clears the rotation
 * @param definitions - Type table `features.transform` is read from
 * @returns Which ids were turned, and which were left alone for having no rotation
 * @throws {@link DocOperationError} for an angle that is not finite, and naming every id that
 *   was not found — in both cases before anything is written
 */
export const setRotation = (
	doc: CanvasDoc,
	ids: readonly string[],
	rotation: number,
	definitions: DocDefinitions,
): SetRotationResult => {
	const degrees = requireRotationDegrees(rotation);
	const locations = requireObjects(doc, ids);
	const result: SetRotationResult = { rotatedIds: [], ignoredIds: [] };

	for (const { object } of locations) {
		const applied = applyRotation(
			object,
			degrees,
			definitions.get(object.type),
		);
		if (applied) {
			result.rotatedIds.push(object.id);
		} else {
			result.ignoredIds.push(object.id);
		}
	}
	return result;
};
