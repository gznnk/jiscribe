import { calcFrameCornerPoints, isTransformedFrame } from "@jiscribe/geometry";
import type { Point } from "@jiscribe/geometry";

import { collectConnectorPoints } from "./calcConnectorBoundingBox";
import { isPoly } from "../../schemas/objects/types/Poly";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isConnectorState } from "../../states/objects/connector/ConnectorState";
import { isGroupState } from "../../states/objects/primitives/group/GroupState";

/**
 * Collects every outline point of an object for oriented-bounds (OBB)
 * calculations: connector endpoints + waypoints, transformed frame corners,
 * poly vertices, and group children recursively.
 *
 * Dispatch order mirrors calcObjectBoundingBox (connector before isPoly,
 * group before isTransformedFrame) — see its doc comment for why.
 *
 * @param obj - The object whose points are collected
 * @param objects - The object map, used to resolve connector endpoints and group children
 * @returns The collected points; empty when the object has no valid extent
 */
export function collectObjectPoints(
	obj: ObjectState,
	objects: Record<string, ObjectState>,
): Point[] {
	if (isConnectorState(obj)) {
		return collectConnectorPoints(obj, objects) ?? [];
	}

	if (isGroupState(obj)) {
		const childPoints: Point[] = [];
		for (const childId of obj.childIds) {
			const child = objects[childId];
			if (!child) {
				continue;
			}
			childPoints.push(...collectObjectPoints(child, objects));
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
