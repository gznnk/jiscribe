import { isArray, isObject, isString } from "@workspace/basic-validators";
import type { Point } from "@workspace/geometry";
import { isPoint } from "@workspace/geometry";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { objectStateValidatorRegistry } from "../../../states/registry/ObjectStateValidatorRegistry";

/**
 * Serialized payload written to and read from the system clipboard on copy/paste.
 * Carries a self-contained set of top-level elements plus their descendants, keyed by id,
 * along with their z-order and the copy-time center used to position the paste.
 */
export type ClipboardData = {
	__type: "jiscribe-canvas-clipboard";
	version: 1;
	objects: Record<string, ObjectState>;
	/**
	 * IDs of the copied top-level elements (objects + connectors), ordered by z-order
	 * (back → front). Connectors are mixed in here rather than kept in a separate array
	 * (same representation as state's rootIds).
	 * On paste, elements are stacked toward the front in this order, preserving the
	 * relative stacking order of the copied set.
	 */
	rootIds: string[];
	center: Point;
};

/**
 * Type guard for {@link ClipboardData}. Treats the value as untrusted input and validates
 * type, version, per-object schema, key↔id consistency, referential self-containment, and
 * acyclicity of group childIds before accepting it.
 */
export const isClipboardData = (value: unknown): value is ClipboardData => {
	if (!isObject(value)) {
		return false;
	}
	const v = value as Record<string, unknown>;

	if (v.__type !== "jiscribe-canvas-clipboard") {
		return false;
	}
	if (v.version !== 1) {
		return false;
	}
	if (!isPoint(v.center)) {
		return false;
	}
	if (!isArray(v.rootIds) || !(v.rootIds as unknown[]).every(isString)) {
		return false;
	}

	if (!isObject(v.objects)) {
		return false;
	}
	const objects = v.objects as Record<string, unknown>;
	for (const [key, obj] of Object.entries(objects)) {
		if (!isObject(obj)) {
			return false;
		}
		const o = obj as Record<string, unknown>;
		if (!isString(o.type)) {
			return false;
		}
		// Strict per-type validation is delegated to the registry (covers id / various fields / CSS safety).
		// Unregistered types are rejected. The registry is initialized via initializeObjectRegistry().
		if (!objectStateValidatorRegistry.validate(o.type, o)) {
			return false;
		}
		// `objects` is a map keyed by id (CopyCommand). childIds / endpoint owner /
		// rootIds resolve references by object id, so self-containment (below) does not hold
		// unless the key matches the id. Reject tampered data where key ≠ id here.
		if (o.id !== key) {
			return false;
		}
	}

	const objectKeys = new Set(Object.keys(objects));
	if (!(v.rootIds as string[]).every((id) => objectKeys.has(id))) {
		return false;
	}

	// Referential integrity (self-containment): the clipboard is untrusted input (any app can write it).
	// As with rootIds, verify that group childIds and connector endpoint owner.id are closed within
	// the `objects` key set. Letting these through could trigger cloneObjects' id-remap fallback
	// (`?? id`) on the untrusted path, causing a reference hijack that pulls existing objects on the
	// destination canvas in as children of a new group or as connection targets.
	if (!isSelfContained(objects, objectKeys)) {
		return false;
	}

	// Acyclicity: cyclic childIds (self-references / mutual references) injected from an untrusted
	// clipboard cause infinite recursion in recursive consumers (ObjectsRenderer's rendering,
	// createMultiSelectGroup's bounds computation, hasSelectedDescendants' selection check, etc.),
	// leading to stack overflow → tab crash (DoS). Since guarding is done only at the external
	// boundary, reject cycles here so downstream consumers can assume acyclicity.
	if (!isAcyclicChildIds(objects)) {
		return false;
	}

	return true;
};

/**
 * Verifies that all group childIds and connector endpoint owner.id values are closed
 * within the `objects` key set (= the objects it itself contains).
 * Per-type validity of each object is already verified before this call, so here we only
 * check the existence of referenced targets.
 */
function isSelfContained(
	objects: Record<string, unknown>,
	objectKeys: Set<string>,
): boolean {
	for (const obj of Object.values(objects)) {
		const o = obj as Record<string, unknown>;

		if (o.type === "group") {
			const childIds = o.childIds as string[];
			if (!childIds.every((childId) => objectKeys.has(childId))) {
				return false;
			}
		} else if (o.type === "connector") {
			const sourceOwnerId = (o.source as { owner?: { id?: string } }).owner?.id;
			const targetOwnerId = (o.target as { owner?: { id?: string } }).owner?.id;
			if (sourceOwnerId !== undefined && !objectKeys.has(sourceOwnerId)) {
				return false;
			}
			if (targetOwnerId !== undefined && !objectKeys.has(targetOwnerId)) {
				return false;
			}
		}
	}

	return true;
}

/**
 * Verifies that the graph formed by group childIds is acyclic (a DAG).
 * Existence of referenced targets is already verified by isSelfContained, so here we only
 * check for cycles. Reaching a node that is currently being visited (VISITING) again is treated
 * as a cycle. Since each node is not revisited after being finalized (VISITED), the validation
 * function itself terminates in a finite number of steps even on cyclic data.
 */
function isAcyclicChildIds(objects: Record<string, unknown>): boolean {
	const VISITING = 1;
	const VISITED = 2;
	const states = new Map<string, number>();

	const visit = (id: string): boolean => {
		const state = states.get(id);
		if (state === VISITED) {
			return true;
		}
		if (state === VISITING) {
			return false; // reached a node still being visited = cycle
		}

		const obj = objects[id] as Record<string, unknown> | undefined;
		// non-group (or unknown id) is treated as a leaf with no children
		if (!obj || obj.type !== "group") {
			states.set(id, VISITED);
			return true;
		}

		states.set(id, VISITING);
		for (const childId of obj.childIds as string[]) {
			if (!visit(childId)) {
				return false;
			}
		}
		states.set(id, VISITED);
		return true;
	};

	for (const id of Object.keys(objects)) {
		if (!visit(id)) {
			return false;
		}
	}
	return true;
}
