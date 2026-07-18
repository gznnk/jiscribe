import type { Point } from "@workspace/geometry";

import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import type { ObjectDoc } from "../../schemas/objects/base/ObjectDoc";
import type { GroupDoc } from "../../schemas/objects/primitives/group/GroupDoc";
import type { CanvasState } from "../../states/canvas/CanvasState";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { GroupState } from "../objects/primitives/group/GroupState";
import type { ObjectMapperRegistry } from "../registry/ObjectMapperRegistry";
import { calculateGroupOrientedBounds } from "../utils/calculateGroupOrientedBounds";

/**
 * Converts CanvasDoc (tree structure) to CanvasState (flat structure).
 * This process normalizes the object tree into a flat map for O(1) access.
 *
 * **Caller's responsibility**: `doc` must be a valid doc that has passed
 * `parseCanvasText` (two-stage validation). This function assumes—without
 * re-checking—that IDs are unique, references are consistent, and the tree is
 * acyclic (the policy of not carrying defensive cost internally →
 * docs/01-design-philosophy.md principle 4). Validation is guaranteed at the
 * external-input boundary (host / the `SYNC_EXTERNAL` entry point).
 *
 * `mapper` is the per-canvas object mapper registry (not the full bundle) so the
 * states layer stays decoupled from the controller-layer registries — the only
 * registry states depends on is `ObjectMapperRegistry` (docs/02-architecture.md).
 */
export const canvasToState = (
	doc: CanvasDoc,
	mapper: ObjectMapperRegistry,
): CanvasState => {
	const objects: Record<string, ObjectState> = {};
	const rootIds: string[] = [];

	// Memo shared across this single bottom-up pass: group ID → collected child
	// points. Lets a parent group reuse a nested group's points instead of
	// re-traversing its subtree, keeping the whole pass O(N) instead of
	// O(N × nesting depth). See calculateGroupOrientedBounds.
	const groupPointCache = new Map<string, Point[]>();

	// Recurse over the validated tree. It is finite and cannot encode a
	// parent/child cycle, so no recursion guard is needed; ID uniqueness and
	// reference integrity are the validator's responsibility. Returns the ID.
	const processObject = (objDoc: ObjectDoc, parentId?: string): string => {
		const objState = mapper.toState(objDoc);
		objState.parentId = parentId;
		objects[objState.id] = objState;

		if (objState.type === "group") {
			const groupDoc = objDoc as GroupDoc;
			const groupState = objState as GroupState;

			// State holds children as a flat ID list; the nested Docs are recursed.
			groupState.childIds = groupDoc.children.map((childDoc) =>
				processObject(childDoc, groupState.id),
			);

			const bounds = calculateGroupOrientedBounds(
				objects,
				groupState.id,
				groupPointCache,
			);
			if (bounds) {
				objects[groupState.id] = {
					...groupState,
					cx: bounds.cx,
					cy: bounds.cy,
					width: bounds.width,
					height: bounds.height,
				} as GroupState;
			}
		}

		return objState.id;
	};

	// root is a mixed array of objects and connectors, and its order is the
	// z-order as-is. The connector invariant (at least one endpoint is owned)
	// is already guaranteed by validateSemantics at the boundary, so it is not
	// re-checked here.
	doc.root.forEach((objDoc) => {
		const id = processObject(objDoc);
		rootIds.push(id);
	});

	return {
		objects,
		rootIds,
		viewport: {
			minX: 0,
			minY: 0,
			width: 1000,
			height: 800,
			zoom: 1,
		},
	};
};

/**
 * Converts CanvasState (flat structure) to CanvasDoc (tree structure).
 * This reconstructs the tree for serialization/storage.
 * Only the object map and root order are read, so any state carrying those
 * two fields (e.g. a DocSnapshot source) can be converted.
 */
export const canvasToDoc = (
	state: Pick<CanvasState, "objects" | "rootIds">,
	mapper: ObjectMapperRegistry,
): CanvasDoc => {
	// Helper to reconstruct an object tree from an ID.
	// The flat state is always internally consistent (index matches objects,
	// childIds are acyclic), so it carries no defense against missing IDs or
	// cycles.
	const reconstructObject = (id: string): ObjectDoc => {
		const objState = state.objects[id];

		// Each mapper converts only its own properties; child recursion is
		// managed centrally here (docs/02-architecture.md).
		const objDoc = mapper.toDoc(objState);

		if (objState.type === "group") {
			const groupState = objState as GroupState;
			const groupDoc = objDoc as GroupDoc;

			groupDoc.children = groupState.childIds.map((childId) =>
				reconstructObject(childId),
			);
		}

		return objDoc;
	};

	return {
		version: 1,
		// root is a single array mixing objects and connectors in z-order.
		root: state.rootIds.map((id) => reconstructObject(id)),
	};
};
