import type { StylePropertyHandler } from "./StylePropertyHandler";
import type { StyleValueType } from "../../schemas/objects/types/ExtraStyleProperty";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../CanvasTypes";
import { collectDescendantIds } from "../utils/collectDescendantIds";
import { createCowObjects } from "../utils/cowObjects";

/** Coerces the menu's string value to the declared type. Returns null when a number fails to parse. */
const coerceStyleValue = (
	valueType: StyleValueType,
	value: string,
): string | number | boolean | null => {
	if (valueType === "number") {
		const n = Number(value);
		return isNaN(n) ? null : n;
	}
	if (valueType === "boolean") {
		return value === "true";
	}
	return value;
};

/**
 * Immutably writes `value` at `path` ("label.fill" → ["label", "fill"]).
 * Returns null when an intermediate parent is missing or not a plain object —
 * nested writes merge into existing parents and never fabricate them.
 */
const writeAtPath = (
	target: Record<string, unknown>,
	path: readonly string[],
	value: unknown,
): Record<string, unknown> | null => {
	const [head, ...rest] = path;
	if (rest.length === 0) {
		return { ...target, [head]: value };
	}
	const child = target[head];
	if (typeof child !== "object" || child === null || Array.isArray(child)) {
		return null;
	}
	const updatedChild = writeAtPath(
		child as Record<string, unknown>,
		rest,
		value,
	);
	return updatedChild === null ? null : { ...target, [head]: updatedChild };
};

/**
 * Shared pipeline for selection-wide property updates: per-object support/type
 * resolution → value coercion → dot-path write, over the selected connector or
 * the selected objects and their group descendants.
 */
export abstract class SelectionStyleProperty implements StylePropertyHandler {
	/** Returns the value type when `obj` supports this property, undefined otherwise. */
	protected abstract resolveValueType(
		obj: ObjectState,
		property: string,
	): StyleValueType | undefined;

	/** Whether the update recurses into descendants of selected groups. */
	protected get appliesToDescendants(): boolean {
		return true;
	}

	apply(
		state: CanvasControllerState,
		property: string,
		value: string,
	): CanvasControllerState {
		const { selectedIds, selectedConnectorId, objects } = state;
		const path = property.split(".");

		// Connector selected (selectedIds is empty)
		if (selectedIds.length === 0 && selectedConnectorId !== null) {
			const connector = objects[selectedConnectorId];
			if (!connector) {
				return state;
			}
			const updated = this.applyToObject(connector, property, path, value);
			if (updated === null) {
				return state;
			}
			// Copy-on-write view instead of a full spread: slider drags call apply
			// per pointermove frame (#213). handleGesture / the reducer materialize.
			const updatedObjects = createCowObjects(objects);
			updatedObjects[selectedConnectorId] = updated;
			return { ...state, objects: updatedObjects };
		}

		if (selectedIds.length === 0) {
			return state;
		}

		const updatedObjects = createCowObjects(objects);
		let changed = false;

		for (const id of selectedIds) {
			const obj = objects[id];
			if (!obj) {
				continue;
			}
			const updated = this.applyToObject(obj, property, path, value);
			if (updated === null) {
				continue;
			}
			updatedObjects[id] = updated;
			changed = true;
		}

		if (this.appliesToDescendants) {
			for (const id of selectedIds) {
				const descendantIds = collectDescendantIds(id, objects);
				for (const descId of descendantIds) {
					// The view falls through to the base map, so this also sees
					// descendants already updated in this loop.
					const descObj = updatedObjects[descId];
					if (!descObj) {
						continue;
					}
					const updated = this.applyToObject(descObj, property, path, value);
					if (updated === null) {
						continue;
					}
					updatedObjects[descId] = updated;
					changed = true;
				}
			}
		}

		if (!changed) {
			return state;
		}

		return { ...state, objects: updatedObjects };
	}

	/** Support gate + coercion + path write for one object. Null means "does not apply" (skip). */
	private applyToObject(
		obj: ObjectState,
		property: string,
		path: readonly string[],
		value: string,
	): ObjectState | null {
		const valueType = this.resolveValueType(obj, property);
		if (valueType === undefined) {
			return null;
		}
		const coerced = coerceStyleValue(valueType, value);
		if (coerced === null) {
			return null;
		}
		return writeAtPath(
			obj as unknown as Record<string, unknown>,
			path,
			coerced,
		) as ObjectState | null;
	}
}
