import {
	isArray,
	isCssSafeValue,
	isObject,
	isString,
} from "@jiscribe/basic-validators";

import { validateDocKeys } from "./validateDocKeys";
import { CANVAS_DOC_KEYS } from "../model/canvas/CanvasDoc";
import { validateViewDoc } from "../model/canvas/validateViewDoc";
import { VIEW_DOC_KEYS, VIEW_PADDING_KEYS } from "../model/canvas/ViewDoc";
import { validateMetaFields } from "../model/objects/validators/validateMetaFields";
import type { SemanticDiagnostic } from "../model/types/SemanticDiagnostic";
import type { ObjectDocValidatorRegistry } from "../registries/ObjectDocValidatorRegistry";

/**
 * Names accepted at the document root: the frame's own fields, plus the legacy
 * `connectors`, which has an error of its own below and so is not reported as an
 * unknown key as well.
 */
const CANVAS_DOC_KEY_SET: ReadonlySet<string> = new Set<string>([
	...CANVAS_DOC_KEYS,
	"connectors",
]);

const VIEW_DOC_KEY_SET: ReadonlySet<string> = new Set<string>(VIEW_DOC_KEYS);

const VIEW_PADDING_KEY_SET: ReadonlySet<string> = new Set<string>(
	VIEW_PADDING_KEYS,
);

/**
 * One field the document writes that its object's type does not hold, located as
 * a reference rather than as text: the key's own name may be anything a file
 * contains (`"a.b"`, `"x[0]"`), so a diagnostic path cannot be read back into a
 * position.
 */
export type UnknownKeyRemoval = {
	/**
	 * The object the key sits under, as it sits in the document being parsed: a
	 * validated object, or the document itself for a root or `view` key.
	 */
	target: Record<string, unknown>;
	/** Segments from `target` down to the key, the `unknownKeyPath` of the warning that reported it. */
	keyPath: readonly (string | number)[];
};

/** What {@link checkStructure} found. */
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
		return [{ path, message: "must be an object", severity: "error" }];
	}

	const o = obj as Record<string, unknown>;
	const errors: SemanticDiagnostic[] = [];

	if (!isString(o.id) || (o.id as string).length === 0) {
		errors.push({
			path: `${path}.id`,
			message: "must be a non-empty string",
			severity: "error",
		});
	}

	if (!isString(o.type)) {
		errors.push({
			path: `${path}.type`,
			message: "must be a string",
			severity: "error",
		});
		return errors;
	}

	// An unregistered type is an opaque object (see OpaqueObjectDoc): held as it is,
	// so nothing past its id and type is ours to check, and its children — if it has
	// any — are not walked either. The id was checked above.
	if (!registry.hasType(o.type as string)) {
		return errors;
	}

	// A field every type carries, so it is checked here rather than by any one of
	// them. Reached only for a registered type: an opaque object is never looked into.
	errors.push(...validateMetaFields(o, path));

	// Per-type validation is the registry's; the names the type does not hold are
	// this stage's own check, held against what the registry built at registration.
	// The position to remove each from is handed over here, the object itself being
	// reachable only in this walk.
	const typeDiagnostics = registry.validate(o.type as string, o, path);
	const keyDeclaration = registry.getKeyDeclaration(o.type as string);
	const diagnostics = [
		...typeDiagnostics,
		...(keyDeclaration === undefined
			? []
			: validateDocKeys(o, path, keyDeclaration, typeDiagnostics)),
	];
	for (const diagnostic of diagnostics) {
		if (diagnostic.unknownKeyPath !== undefined) {
			unknownKeyRemovals.push({
				target: o,
				keyPath: diagnostic.unknownKeyPath,
			});
		}
	}
	errors.push(...diagnostics);

	// Group children recursion is a structural rule, so handle it here in checkStructure
	if (o.type === "group") {
		if (!isArray(o.children)) {
			errors.push({
				path: `${path}.children`,
				message: "must be an array",
				severity: "error",
			});
		} else if ((o.children as unknown[]).length === 0) {
			// An empty group is a degenerate state with undefined bounds. Since the
			// creation paths always produce children, empty children is treated as
			// corruption and rejected at the boundary.
			errors.push({
				path: `${path}.children`,
				message: "group must have at least one child",
				severity: "error",
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
						severity: "error",
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
 * Checks the structural rules of a CanvasDoc: the version constant, the removal of
 * the legacy top-level `connectors` field, the `$schema` pointer, the canvas
 * surface color, the `view` declaration, each object's `meta`, and each entry in
 * `root` (delegating per-type checks to the registry and recursing into group
 * children). Every name the frame does not hold — at the root, in `view` and in
 * `view.padding` — is reported as a warning and asked to be removed, the way the
 * registry reports one an object's type does not hold.
 *
 * @param doc - The candidate document, already stripped of unknown content; only read here
 * @param registry - Decides which types are known and holds each type's own validator
 * @returns The diagnostics, errors and warnings alike, and the fields the
 *   unknown-key warnings among them ask to be removed. Both are empty when the
 *   document is structurally valid and holds nothing the types do not know.
 */
export function checkStructure(
	doc: unknown,
	registry: ObjectDocValidatorRegistry,
): StructureValidationResult {
	if (!isObject(doc)) {
		return {
			diagnostics: [
				{
					path: "/",
					message: "Document must be an object with a 'root' field",
					severity: "error",
				},
			],
			unknownKeyRemovals: [],
		};
	}

	const d = doc as Record<string, unknown>;
	const errors: SemanticDiagnostic[] = [];
	const unknownKeyRemovals: UnknownKeyRemoval[] = [];

	// Every frame key sits under the document itself, whatever its depth, so one
	// closure covers the root, `view` and `view.padding`. Warnings rather than
	// errors for the same reason as the per-type ones (ObjectDocValidatorRegistry):
	// the document still opens, minus the field, which the next save drops.
	const reportUnknownFrameKeys = (
		container: Record<string, unknown>,
		knownKeys: ReadonlySet<string>,
		containerPath: readonly string[],
		subject: string,
	): void => {
		Object.keys(container)
			.filter((key) => !knownKeys.has(key))
			.forEach((key) => {
				const unknownKeyPath = [...containerPath, key];
				errors.push({
					path: unknownKeyPath.join("."),
					message: `Unknown property "${key}" on ${subject}: it was ignored and will be dropped on save.`,
					severity: "warning",
					unknownKeyPath,
				});
				unknownKeyRemovals.push({ target: d, keyPath: unknownKeyPath });
			});
	};

	// The schema defines version as const 1. Only the v1 format exists and there is
	// no handling for v2+, so unknown versions are not silently accepted but rejected
	// at the boundary.
	if (d.version !== 1) {
		errors.push({ path: "version", message: "must be 1", severity: "error" });
	}

	// The old format (connectors held in a separate array) would silently lose
	// connectors, so rather than migrating, fail fast with an explicit error
	// (connectors are now integrated into root).
	if (d.connectors !== undefined) {
		errors.push({
			path: "connectors",
			message:
				"'connectors' is no longer a top-level field; place connectors inside 'root' as \"type\": \"connector\" entries (z-order).",
			severity: "error",
		});
	}

	reportUnknownFrameKeys(d, CANVAS_DOC_KEY_SET, [], "the document");

	// A legacy pointer that is tolerated on input and dropped on save (see
	// CanvasDocV1.$schema); tolerating it does not extend to another type of value.
	if (d.$schema !== undefined && !isString(d.$schema)) {
		errors.push({
			path: "$schema",
			message: "must be a string",
			severity: "error",
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
			severity: "error",
			beyondSchema: true,
		});
	}

	// Optional display declaration; omitted means "frame it however the host would"
	// (see CanvasDoc.view).
	if (d.view !== undefined) {
		errors.push(...validateViewDoc(d.view, "view"));
		// Only an object has keys to look at; a value of another type is already an
		// error from validateViewDoc.
		if (isObject(d.view)) {
			reportUnknownFrameKeys(
				d.view,
				VIEW_DOC_KEY_SET,
				["view"],
				'the document\'s "view"',
			);
			if (isObject(d.view.padding)) {
				reportUnknownFrameKeys(
					d.view.padding,
					VIEW_PADDING_KEY_SET,
					["view", "padding"],
					'the document\'s "view.padding"',
				);
			}
		}
	}

	if (!isArray(d.root)) {
		errors.push({
			path: "root",
			message: "must be an array",
			severity: "error",
		});
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
