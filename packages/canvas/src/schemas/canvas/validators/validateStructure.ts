import { isArray, isObject, isString } from "@workspace/basic-validators";

import type { SemanticDiagnostic } from "./types";
import type { createObjectDocValidatorRegistry } from "../../registry/ObjectDocValidatorRegistry";

type ObjectDocValidatorRegistry = ReturnType<
	typeof createObjectDocValidatorRegistry
>;

function validateObjectNode(
	obj: unknown,
	path: string,
	registry: ObjectDocValidatorRegistry,
): SemanticDiagnostic[] {
	if (!isObject(obj)) {
		return [{ path, message: "must be an object" }];
	}

	const o = obj as Record<string, unknown>;
	const errors: SemanticDiagnostic[] = [];

	if (!isString(o.id) || (o.id as string).length === 0) {
		errors.push({ path: `${path}.id`, message: "must be a non-empty string" });
	}

	if (!isString(o.type)) {
		errors.push({ path: `${path}.type`, message: "must be a string" });
		return errors;
	}

	// Reject unregistered (unknown) types here. Letting one through makes validation
	// return ok, but then mapper resolution in canvasToState throws and crashes the
	// whole editor. A type is registered if the registry has features for it.
	if (registry.getFeatures(o.type as string) === undefined) {
		errors.push({
			path: `${path}.type`,
			message: `Unknown object type "${o.type as string}".`,
		});
		return errors;
	}

	// Delegate per-type validation to the registry
	errors.push(...registry.validate(o.type as string, o, path));

	// Group children recursion is a structural rule, so handle it here in validateStructure
	if (o.type === "group") {
		if (!isArray(o.children)) {
			errors.push({ path: `${path}.children`, message: "must be an array" });
		} else if ((o.children as unknown[]).length === 0) {
			// An empty group is a degenerate state with undefined bounds. Since the
			// creation paths always produce children, empty children is treated as
			// corruption and rejected at the boundary.
			errors.push({
				path: `${path}.children`,
				message: "group must have at least one child",
			});
		} else {
			(o.children as unknown[]).forEach((child, i) => {
				const childPath = `${path}.children[${i}]`;
				// Invariant: connectors live only directly under root; they cannot be a group's child.
				if (
					isObject(child) &&
					(child as Record<string, unknown>).type === "connector"
				) {
					errors.push({
						path: childPath,
						message:
							"connector must be a top-level entry of 'root', not inside a group's children",
					});
				}
				errors.push(...validateObjectNode(child, childPath, registry));
			});
		}
	}

	return errors;
}

/**
 * Validates the structural rules of a CanvasDoc: the version constant, the removal of
 * the legacy top-level `connectors` field, and each entry in `root` (delegating
 * per-type checks to the registry and recursing into group children).
 *
 * @returns A list of diagnostics; empty when the document is structurally valid.
 */
export function validateStructure(
	doc: unknown,
	registry: ObjectDocValidatorRegistry,
): SemanticDiagnostic[] {
	if (!isObject(doc)) {
		return [
			{
				path: "/",
				message: "Document must be an object with a 'root' field",
			},
		];
	}

	const d = doc as Record<string, unknown>;
	const errors: SemanticDiagnostic[] = [];

	// The schema defines version as const 1. Only the v1 format exists and there is
	// no handling for v2+, so unknown versions are not silently accepted but rejected
	// at the boundary.
	if (d.version !== 1) {
		errors.push({ path: "version", message: "must be 1" });
	}

	// The old format (connectors held in a separate array) would silently lose
	// connectors, so rather than migrating, fail fast with an explicit error
	// (connectors are now integrated into root).
	if (d.connectors !== undefined) {
		errors.push({
			path: "connectors",
			message:
				"'connectors' is no longer a top-level field; place connectors inside 'root' as \"type\": \"connector\" entries (z-order).",
		});
	}

	// Optional canvas surface color. When present it must be a color string;
	// omitted means "follow the theme background" (see CanvasDoc.background).
	if (d.background !== undefined && !isString(d.background)) {
		errors.push({ path: "background", message: "must be a string" });
	}

	if (!isArray(d.root)) {
		errors.push({ path: "root", message: "must be an array" });
	} else {
		// root is a mixed array of objects and connectors. Per-type validation goes
		// through validateObjectNode → the registry dispatches by type (connector uses
		// validateConnectorDoc).
		(d.root as unknown[]).forEach((obj, i) => {
			errors.push(...validateObjectNode(obj, `root[${i}]`, registry));
		});
	}

	return errors;
}
