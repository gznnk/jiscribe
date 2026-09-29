import type { BoundingBox, Point } from "@jiscribe/geometry";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { ObjectMapperRegistry } from "../../../../../../states/registry/ObjectMapperRegistry";
import type { HitTestRegistries } from "../../../../../utils/hitTestObjects";
import {
	DEFAULT_HIT_TOLERANCE,
	isPointOnObject,
} from "../../../../../utils/hitTestObjects";
import { isConnectableObject } from "../../../../../utils/isConnectableObject";
import { sortObjectIdsByZOrder } from "../../../../../utils/sortObjectIdsByZOrder";

/** The lookups the search reads: silhouettes and routes, plus the connectable feature. */
export type ConnectableTargetRegistries = HitTestRegistries & {
	objectMapper: Pick<ObjectMapperRegistry, "getFeatures">;
};

/** Whether the world point falls inside the axis-aligned box. Edges count. */
const isPointInBox = (point: Point, box: BoundingBox): boolean =>
	point.x >= box.left &&
	point.x <= box.right &&
	point.y >= box.top &&
	point.y <= box.bottom;

/**
 * The front-most connectable object drawn at the cursor.
 *
 * This is a geometric search over the committed state, not a DOM one, because a
 * shape that passes its interior through (a container, an awsGroup) is not under
 * the pointer as far as the DOM is concerned while still being what the user is
 * aiming at. Pass-through is how those shapes keep their contents selectable; it
 * is not a statement about what a connector may attach to.
 *
 * `bboxes` is only a pre-filter: it is the root-level axis-aligned box, so a
 * rotated or curved shape reports a superset of itself and the survivors are put
 * through the drawn-silhouette test. Scanning boxes first is what keeps this
 * affordable on every drag event — the precise test runs on the handful that
 * remain rather than on the whole document.
 *
 * The object holding the drag's fixed endpoint is deliberately not excluded, so
 * a self-loop can be dropped back onto its own shape; keeping the two ends off
 * the same anchor is computeEditedEndpoint's job.
 *
 * @param args.point - Cursor in world coordinates
 * @param args.bboxes - Object id → root-level bounding box, from the drag's start
 *   snapshot; objects absent from it (connectors, zero-extent shapes) are skipped
 * @param args.objects - The canvas's object map, used to resolve the surviving ids
 * @param args.rootIds - Root id list, which decides the z-order the winner is picked by
 * @param args.registries - Silhouette / route lookups plus the registry the
 *   `connectable` feature is read from
 * @param args.tolerance - Extra reach (world px) for line-like shapes; defaults to
 *   DEFAULT_HIT_TOLERANCE
 * @returns The front-most connectable target and its id, or null when the point
 *   is on nothing that accepts an endpoint
 */
export function findConnectableTargetAt(args: {
	point: Point;
	bboxes: Record<string, BoundingBox>;
	objects: Record<string, ObjectState>;
	rootIds: string[];
	registries: ConnectableTargetRegistries;
	tolerance?: number;
}): { id: string; object: ObjectState } | null {
	const { point, bboxes, objects, rootIds, registries } = args;
	const tolerance = args.tolerance ?? DEFAULT_HIT_TOLERANCE;

	const hitIds: string[] = [];
	// `for...in` rather than Object.entries/keys: this runs on every drag event over
	// the whole document, and materializing the key list allocates per call.
	for (const id in bboxes) {
		if (!isPointInBox(point, bboxes[id])) {
			continue;
		}
		const object = objects[id];
		if (!object || !isConnectableObject(object, registries.objectMapper)) {
			continue;
		}
		if (!isPointOnObject(point, object, objects, registries, tolerance)) {
			continue;
		}
		hitIds.push(id);
	}

	// Back to front, so the last is the one drawn on top. The one hit a drag event
	// usually produces costs nothing to order (sortObjectIdsByZOrder returns early).
	const frontMostId = sortObjectIdsByZOrder(hitIds, objects, rootIds).at(-1);
	if (frontMostId === undefined) {
		return null;
	}
	return { id: frontMostId, object: objects[frontMostId] };
}
