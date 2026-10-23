import { isPoly } from "@jiscribe/doc/model/objects/types/Poly";
import { calcFrameCornerPoints, isTransformedFrame } from "@jiscribe/geometry";
import type { Point } from "@jiscribe/geometry";

import { collectDrawnConnectorPoints } from "./calcConnectorBoundingBox";
import type { ConnectorRouteRegistries } from "./VisualExtentRegistries";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isConnectorState } from "../../states/objects/connector/ConnectorState";
import { isGroupState } from "../../states/objects/primitives/group/GroupState";

/**
 * Collects every outline point of an object for oriented-bounds (OBB)
 * calculations: connector endpoints + waypoints, transformed frame corners,
 * poly vertices, and group children recursively. A connector's label is not
 * collected, so the multi-select frame built from these points leaves it out.
 *
 * Dispatch order mirrors calcObjectBoundingBox (connector before isPoly,
 * group before isTransformedFrame) — see its doc comment for why.
 *
 * @param obj - The object whose points are collected
 * @param objects - The object map, used to resolve connector endpoints and group children
 * @param registries - Per-canvas registries a connector's path is resolved through,
 *   so its points are the drawn route (outline, declared anchors, orthogonal stubs)
 * @returns The collected points; empty when the object has no valid extent. A
 *   connector's point objects are shared with the renderer's cached route — copy
 *   a point before writing to it
 */
export function collectObjectPoints(
	obj: ObjectState,
	objects: Record<string, ObjectState>,
	registries: ConnectorRouteRegistries,
): Point[] {
	if (isConnectorState(obj)) {
		return collectDrawnConnectorPoints(obj, objects, registries) ?? [];
	}

	if (isGroupState(obj)) {
		const childPoints: Point[] = [];
		for (const childId of obj.childIds) {
			const child = objects[childId];
			if (!child) {
				continue;
			}
			childPoints.push(...collectObjectPoints(child, objects, registries));
		}
		return childPoints;
	}

	if (isTransformedFrame(obj)) {
		return calcFrameCornerPoints(obj);
	}

	if (isPoly(obj)) {
		return [...obj.points];
	}

	return [];
}

/**
 * {@link collectObjectPoints} over several objects, flattened in id order.
 *
 * @param ids - IDs of the objects to collect; a missing id contributes nothing
 * @param objects - The object map, used to resolve connector endpoints and group children
 * @param registries - Per-canvas registries a connector's path is resolved through
 * @returns The collected points; empty when no object has a valid extent
 */
export function collectObjectsPoints(
	ids: Iterable<string>,
	objects: Record<string, ObjectState>,
	registries: ConnectorRouteRegistries,
): Point[] {
	const points: Point[] = [];
	for (const id of ids) {
		const obj = objects[id];
		if (obj) {
			points.push(...collectObjectPoints(obj, objects, registries));
		}
	}
	return points;
}
