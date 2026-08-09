import type { Point } from "@jiscribe/geometry";

import { DocOperationError } from "./errors";
import { requireObject } from "./objectAccess";
import { type DocDefinitions, isConnectorObject } from "./objectGeometry";
import { requirePolyPoints } from "./polyFields";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";

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
	object.points = requirePolyPoints(id, points, definition);
};
