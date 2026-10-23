import { isPoly } from "@jiscribe/doc/model/objects/types/Poly";
import {
	calcBoundingBox,
	calcPolyBoundingBox,
	isTransformedFrame,
} from "@jiscribe/geometry";
import type { BoundingBox, TransformedFrame } from "@jiscribe/geometry";

import { calcConnectorBoundingBox } from "./calcConnectorBoundingBox";
import { calcTransformedRectBounds } from "./calcTransformedRectBounds";
import type { VisualExtentRegistries } from "./VisualExtentRegistries";
import type { ObjectVisualBoundsRegistry } from "../../rendering/objects/registry/ObjectVisualBoundsRegistry";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isConnectorState } from "../../states/objects/connector/ConnectorState";
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

	const decoration = calcTransformedRectBounds(calculator(obj), obj);
	return {
		left: Math.min(geometryBox.left, decoration.left),
		top: Math.min(geometryBox.top, decoration.top),
		right: Math.max(geometryBox.right, decoration.right),
		bottom: Math.max(geometryBox.bottom, decoration.bottom),
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
 * @param visualExtentRegistries - Per-canvas registries measuring what is drawn:
 *   a frame shape's box widened by what it draws outside its geometry (an actor's
 *   label, say), a connector's path resolved as the renderer routes it. Pass them
 *   from the visual-extent consumers (zoom-to-fit, export viewBox, culling, menu
 *   placement). Omitted, a frame keeps its geometry box but a connector's path is
 *   not the drawn route (see calcConnectorBoundingBox). Of the bundle, only
 *   `objectVisualBounds` must stay out of a geometry-box consumer; as this takes
 *   the bundle whole, such a consumer resolves connectors through
 *   ConnectorRouteRegistries instead — the multi-select frame takes its extent
 *   from collectObjectPoints that way
 * @returns The bounding box, or null when the object has no valid extent
 *   (unresolvable connector, group without valid children, empty poly, unknown kind)
 */
export function calcObjectBoundingBox(
	obj: ObjectState,
	objects: Record<string, ObjectState>,
	visualExtentRegistries?: VisualExtentRegistries | null,
): BoundingBox | null {
	if (isConnectorState(obj)) {
		return calcConnectorBoundingBox(obj, objects, visualExtentRegistries);
	}

	if (isGroupState(obj)) {
		return calcObjectsBoundingBox(
			obj.childIds,
			objects,
			visualExtentRegistries,
		);
	}

	if (isTransformedFrame(obj)) {
		const geometryBox = calcBoundingBox(obj);
		return visualExtentRegistries
			? unionVisualBounds(
					obj,
					geometryBox,
					visualExtentRegistries.objectVisualBounds,
				)
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
 * @param visualExtentRegistries - Per-canvas registries measuring what is drawn;
 *   see {@link calcObjectBoundingBox} for when to pass them
 * @returns The union bounding box, or null when no object has a valid extent
 */
export function calcObjectsBoundingBox(
	ids: Iterable<string>,
	objects: Record<string, ObjectState>,
	visualExtentRegistries?: VisualExtentRegistries | null,
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

		const bbox = calcObjectBoundingBox(obj, objects, visualExtentRegistries);
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
