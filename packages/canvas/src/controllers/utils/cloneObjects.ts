import type { Point } from "@workspace/geometry";

import type { EndpointRef } from "../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../states/objects/connections/connector/ConnectorState";
import type { GroupState } from "../../states/objects/primitives/group/GroupState";
import { moveGroup } from "../gestures/handlers/objects/primitives/GroupController";
import { objectBehaviorRegistry } from "../gestures/registry/ObjectBehaviorRegistry";

const remapEndpointRef = (
	ref: EndpointRef,
	idRemap: Map<string, string>,
): EndpointRef => {
	if (!ref.owner) {
		return ref;
	}
	return {
		...ref,
		owner: { ...ref.owner, id: idRemap.get(ref.owner.id) ?? ref.owner.id },
	};
};

/**
 * Clones a set of top-level elements, assigns fresh IDs, and moves them by the given offset.
 *
 * - `topLevelIds` are the top-level elements (objects + connectors) ordered by z-order
 *   (back → front). Accepts the same representation as state / clipboard `rootIds`.
 * - The offset is applied only to non-connectors (connectors are not moved, since their
 *   endpoints follow their owning shapes).
 * - All parentId / childIds / connector endpoint references are remapped to the new IDs.
 * - `allObjects` must also include the descendants of `topLevelIds`.
 *
 * Even when the input is not a closed forest (e.g. via an external clipboard, where a child
 * object's parent is not present in allObjects), this always produces a self-consistent forest:
 * - Objects whose parentId cannot be resolved within allObjects have their parentId dropped and
 *   are promoted to the top level (newTopLevelIds), preventing orphans.
 * - A group's childIds are narrowed to only the children that exist within allObjects
 *   (no dangling references to nonexistent children are left behind).
 *
 * @returns `newTopLevelIds` lists the new IDs in the same order as `topLevelIds`, with promoted
 *   orphans appended at the end. The caller dispatches them to shapes/connectors by type.
 */
export function cloneObjects(
	topLevelIds: string[],
	allObjects: Record<string, ObjectState>,
	offset: Point,
): {
	newObjects: Record<string, ObjectState>;
	newTopLevelIds: string[];
	idRemap: Map<string, string>;
} {
	// ── 1. Build the old ID → new ID mapping ──────────────────────────────────
	const idRemap = new Map<string, string>();
	for (const srcId of Object.keys(allObjects)) {
		idRemap.set(srcId, crypto.randomUUID());
	}

	// ── 2. Clone all objects: remap ID / parentId / childIds / connection endpoints to new IDs ──
	const clonedObjects: Record<string, ObjectState> = {};
	// New object IDs whose parent could not be remapped and that were promoted to the top level
	const detachedNewIds: string[] = [];

	for (const [srcId, srcObj] of Object.entries(allObjects)) {
		const clonedId = idRemap.get(srcId)!;

		// If the parent does not exist within allObjects, drop parentId and promote to the top level.
		// (Prevents orphaning when children arrive without their parent group, e.g. via external clipboard.)
		// Connectors are passed explicitly in topLevelIds and included in newTopLevelIds, so they are not promoted.
		const remappedParentId =
			srcObj.parentId !== undefined ? idRemap.get(srcObj.parentId) : undefined;
		if (
			srcObj.parentId !== undefined &&
			remappedParentId === undefined &&
			srcObj.type !== "connector"
		) {
			detachedNewIds.push(clonedId);
		}

		let clone: ObjectState = {
			...srcObj,
			id: clonedId,
			parentId: remappedParentId,
		};

		// Group: remap childIds to new IDs (keep only children present in the clone set)
		if (srcObj.type === "group") {
			const srcGroup = srcObj as GroupState;
			clone = {
				...clone,
				childIds: srcGroup.childIds
					.filter((id) => idRemap.has(id))
					.map((id) => idRemap.get(id)!),
			} as GroupState;
		}

		// Connector: remap the endpoint owner IDs to new IDs
		if (srcObj.type === "connector") {
			const srcConn = srcObj as ConnectorState;
			clone = {
				...clone,
				source: remapEndpointRef(srcConn.source, idRemap),
				target: remapEndpointRef(srcConn.target, idRemap),
			} as ConnectorState;
		}

		clonedObjects[clonedId] = clone;
	}

	// ── 3. Apply the offset (top-level non-connectors only) ──────────────────
	for (const srcId of topLevelIds) {
		const clonedId = idRemap.get(srcId);
		if (!clonedId) {
			continue;
		}
		const clone = clonedObjects[clonedId];
		// Connectors are not offset, since their endpoints follow their owning shapes.
		if (!clone || clone.type === "connector") {
			continue;
		}

		if (clone.type === "group") {
			moveGroup(clonedId, clonedObjects, clonedObjects, offset);
		} else {
			const moveByDelta = objectBehaviorRegistry.getMoveByDelta(clone.type);
			if (moveByDelta) {
				clonedObjects[clonedId] = moveByDelta(clone, offset);
			}
		}
	}

	// ── 4. Build newTopLevelIds (preserve topLevelIds order, append promoted orphans at the end) ──
	const newTopLevelIds: string[] = [];
	const seen = new Set<string>();
	for (const id of topLevelIds) {
		const clonedId = idRemap.get(id);
		if (clonedId !== undefined && !seen.has(clonedId)) {
			seen.add(clonedId);
			newTopLevelIds.push(clonedId);
		}
	}
	for (const clonedId of detachedNewIds) {
		if (!seen.has(clonedId)) {
			seen.add(clonedId);
			newTopLevelIds.push(clonedId);
		}
	}

	return { newObjects: clonedObjects, newTopLevelIds, idRemap };
}
