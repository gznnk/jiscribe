import {
	isArray,
	isCssSafeValue,
	isObject,
	isString,
} from "@jiscribe/basic-validators";

import { validateViewDoc } from "../model/canvas/validateViewDoc";
import type { SemanticDiagnostic } from "../model/types/SemanticDiagnostic";
import type { ObjectDocValidatorRegistry } from "../plugin/ObjectDocValidatorRegistry";

/**
 * One field the document writes that its object's type does not hold, located as
 * a reference rather than as text: the key's own name may be anything a file
 * contains (`"a.b"`, `"x[0]"`), so a diagnostic path cannot be read back into a
 * position.
 */
export type UnknownKeyRemoval = {
	/** The validated object the key sits on, as it sits in the document being parsed. */
	target: Record<string, unknown>;
	/** Segments from `target` down to the key, the `unknownKeyPath` of the warning that reported it. */
	keyPath: readonly (string | number)[];
};

/** What {@link validateStructure} found. */
export type StructureValidationResult = {
	/** Diagnostics of both severities, in document order. */
	diagnostics: SemanticDiagnostic[];
	/** What the unknown-key warnings among {@link diagnostics} ask the parser to remove. */
	unknownKeyRemovals: UnknownKeyRemoval[];
};

function validateObjectNode(
	obj: unknown,
	path: string,
	registry: ObjectDocValidatorRegistry,
	unknownKeyRemovals: UnknownKeyRemoval[],
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

	// An unregistered type is an opaque object (see OpaqueObjectDoc): held as it is,
	// so nothing past its id and type is ours to check, and its children — if it has
	// any — are not walked either. The id was checked above.
	if (!registry.hasType(o.type as string)) {
		return errors;
	}

	// Delegate per-type validation to the registry, which also reports the names
	// the type does not hold and hands over the position to remove each from; the
	// object itself is only reachable here.
	const diagnostics = registry.validate(o.type as string, o, path);
	for (const diagnostic of diagnostics) {
		if (diagnostic.unknownKeyPath !== undefined) {
			unknownKeyRemovals.push({
				target: o,
				keyPath: diagnostic.unknownKeyPath,
			});
		}
	}
	errors.push(...diagnostics);

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
				errors.push(
					...validateObjectNode(child, childPath, registry, unknownKeyRemovals),
				);
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
 * @param doc - The candidate document, already stripped of unknown content; only read here
 * @param registry - Decides which types are known and holds each type's own validator
 * @returns The diagnostics, errors and warnings alike, and the fields the
 *   unknown-key warnings among them ask to be removed. Both are empty when the
 *   document is structurally valid and holds nothing the types do not know.
 */
export function validateStructure(
	doc: unknown,
	registry: ObjectDocValidatorRegistry,
): StructureValidationResult {
	if (!isObject(doc)) {
		return {
			diagnostics: [
				{
					path: "/",
					message: "Document must be an object with a 'root' field",
				},
			],
			unknownKeyRemovals: [],
		};
	}

	const d = doc as Record<string, unknown>;
	const errors: SemanticDiagnostic[] = [];
	const unknownKeyRemovals: UnknownKeyRemoval[] = [];

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
	// The value reaches a CSS context, so it goes through the same sanitization
	// as an object's fill/stroke (validateFillStyleFields).
	if (d.background !== undefined && !isCssSafeValue(d.background)) {
		errors.push({
			path: "background",
			message: "must be a safe CSS color value",
			beyondSchema: true,
		});
	}

	// Optional display declaration; omitted means "frame it however the host would"
	// (see CanvasDoc.view).
	if (d.view !== undefined) {
		errors.push(...validateViewDoc(d.view, "view"));
	}

	if (!isArray(d.root)) {
		errors.push({ path: "root", message: "must be an array" });
	} else {
		// root is a mixed array of objects and connectors. Per-type validation goes
		// through validateObjectNode → the registry dispatches by type (connector uses
		// validateConnectorDoc).
		(d.root as unknown[]).forEach((obj, i) => {
			errors.push(
				...validateObjectNode(obj, `root[${i}]`, registry, unknownKeyRemovals),
			);
		});
	}

	return { diagnostics: errors, unknownKeyRemovals };
}
