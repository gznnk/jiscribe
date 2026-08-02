import {
	calcAffineTransformedPoint,
	calcBoundingBox,
	calcPolyBoundingBox,
	degreesToRadians,
	isTransformedFrame,
} from "@workspace/geometry";
import type { BoundingBox, TransformedFrame } from "@workspace/geometry";

import { calcConnectorBoundingBox } from "./calcConnectorBoundingBox";
import type { ObjectVisualBoundsRegistry } from "../../presentations/objects/registry/ObjectVisualBoundsRegistry";
import { isPoly } from "../../schemas/objects/types/Poly";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isConnectorState } from "../../states/objects/connections/connector/ConnectorState";
import { isGroupState } from "../../states/objects/primitives/group/GroupState";

/**
 * Widens a frame's geometry box by what the type draws outside it, mapping the
 * local-space rect's four corners through the shape's own transform so the
 * decoration lands where it is drawn. The result is unioned with the geometry
 * box rather than replacing it, so a calculator reporting less than the box
 * cannot shrink the extent.
 */
const unionVisualBounds = (
	obj: ObjectState & TransformedFrame,
	geometryBox: BoundingBox,
	visualBounds: Pick<ObjectVisualBoundsRegistry, "get">,
): BoundingBox => {
	const calculator = visualBounds.get(obj.type);
	if (!calculator) {
		return geometryBox;
	}

	const rect = calculator(obj);
	const radians = degreesToRadians(obj.rotation ?? 0);
	const corners = [
		[rect.x, rect.y],
		[rect.x + rect.width, rect.y],
		[rect.x + rect.width, rect.y + rect.height],
		[rect.x, rect.y + rect.height],
	].map(([localX, localY]) =>
		calcAffineTransformedPoint(
			localX,
			localY,
			obj.scaleX ?? 1,
			obj.scaleY ?? 1,
			radians,
			obj.cx,
			obj.cy,
		),
	);

	const xs = corners.map((corner) => corner.x);
	const ys = corners.map((corner) => corner.y);
	return {
		left: Math.min(geometryBox.left, ...xs),
		top: Math.min(geometryBox.top, ...ys),
		right: Math.max(geometryBox.right, ...xs),
		bottom: Math.max(geometryBox.bottom, ...ys),
	};
};

/**
 * Computes the axis-aligned bounding box of a single object, dispatching on
 * its kind. This is the single source of truth for bbox composition — do not
 * re-implement the connector/group/frame/poly branching at call sites.
 *
 * Dispatch order is load-bearing:
 * - Connectors pass isPoly (points = intermediate waypoints only), so they
 *   must be resolved via calcConnectorBoundingBox before the isPoly branch.
 * - Groups pass isTransformedFrame (GroupState includes Frame), so recursion
 *   over children must come before the frame branch.
 *
 * @param obj - The object whose bounding box is computed
 * @param objects - The object map, used to resolve connector endpoints and group children
 * @param visualBounds - Per-canvas ObjectVisualBoundsRegistry, widening a frame
 *   shape's box by what it draws outside its geometry (an actor's label, say).
 *   Pass it only from the visual-extent consumers (zoom-to-fit, export viewBox,
 *   culling, menu placement); omitting it yields the geometry box, which is
 *   what selection, snapping and group bounds must keep using
 * @returns The bounding box, or null when the object has no valid extent
 *   (unresolvable connector, group without valid children, empty poly, unknown kind)
 */
export function calcObjectBoundingBox(
	obj: ObjectState,
	objects: Record<string, ObjectState>,
	visualBounds?: Pick<ObjectVisualBoundsRegistry, "get"> | null,
): BoundingBox | null {
	if (isConnectorState(obj)) {
		return calcConnectorBoundingBox(obj, objects);
	}

	if (isGroupState(obj)) {
		return calcObjectsBoundingBox(obj.childIds, objects, visualBounds);
	}

	if (isTransformedFrame(obj)) {
		const geometryBox = calcBoundingBox(obj);
		return visualBounds
			? unionVisualBounds(obj, geometryBox, visualBounds)
			: geometryBox;
	}

	if (isPoly(obj)) {
		return calcPolyBoundingBox(obj.points);
	}

	return null;
}

/**
 * Computes the union bounding box of the objects with the given IDs.
 *
 * Missing IDs and objects without a valid extent are skipped.
 *
 * @param ids - IDs of the objects to include
 * @param objects - The object map
 * @param visualBounds - Per-canvas ObjectVisualBoundsRegistry; see
 *   {@link calcObjectBoundingBox} for when to pass it
 * @returns The union bounding box, or null when no object has a valid extent
 */
export function calcObjectsBoundingBox(
	ids: Iterable<string>,
	objects: Record<string, ObjectState>,
	visualBounds?: Pick<ObjectVisualBoundsRegistry, "get"> | null,
): BoundingBox | null {
	let left = Infinity;
	let top = Infinity;
	let right = -Infinity;
	let bottom = -Infinity;
	let hasValidObject = false;

	for (const id of ids) {
		const obj = objects[id];
		if (!obj) {
			continue;
		}

		const bbox = calcObjectBoundingBox(obj, objects, visualBounds);
		if (!bbox) {
			continue;
		}

		left = Math.min(left, bbox.left);
		top = Math.min(top, bbox.top);
		right = Math.max(right, bbox.right);
		bottom = Math.max(bottom, bbox.bottom);
		hasValidObject = true;
	}

	if (!hasValidObject) {
		return null;
	}

	return { left, top, right, bottom };
}
