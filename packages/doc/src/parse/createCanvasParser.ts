import { checkSemantics } from "./checkSemantics";
import type { UnknownKeyRemoval } from "./checkStructure";
import { checkStructure } from "./checkStructure";
import { stripUnknownContent } from "./stripUnknownContent";
import type { CanvasDoc } from "../model/canvas/CanvasDoc";
import type { SemanticDiagnostic } from "../model/types/SemanticDiagnostic";
import {
	isSemanticError,
	isSemanticWarning,
} from "../model/types/SemanticDiagnostic";
import type { DocDefinitionsConfig } from "../plugin/resolveDocDefinitions";
import type { ObjectDocValidatorRegistry } from "../registries/ObjectDocValidatorRegistry";
import { createDocValidatorRegistry } from "../registries/ObjectDocValidatorRegistry";

/**
 * Result of parsing a Canvas document string.
 *
 * Represents JSON syntax error / semantic error / unexpected exception during validation / success
 * as a discriminated union. Exceptions are not used for control flow, so callers can handle every
 * case exhaustively via `switch (result.kind)`.
 *
 * `ok.warnings` lists what {@link stripUnknownContent} removed (unknown pure-enum
 * values, and the rare unknown-type object it cannot keep), every object of an
 * unknown type it kept as it is, and every field a type does not hold that the
 * registry found on an object of it. Empty for a fully-known document. `ok.doc`
 * is the stripped doc with those fields removed, so serializing it is what makes
 * a removal stick on save, and what writes a kept object back unchanged.
 *
 * The error cases carry errors only: a warning never appears among them, since a
 * document reported as unreadable has nothing to save.
 */
export type CanvasParseResult =
	| { kind: "ok"; doc: CanvasDoc; warnings: SemanticDiagnostic[] }
	| { kind: "syntax-error"; message: string }
	| { kind: "structure-error"; diagnostics: SemanticDiagnostic[] }
	| { kind: "semantic-error"; diagnostics: SemanticDiagnostic[] }
	| { kind: "internal-error"; message: string };

/**
 * Deletes one field a type does not hold from the document. Written in place:
 * everything reachable from here was built by this module's own `JSON.parse` (or
 * copied from it by the strip), so there is no caller's value to protect — unlike
 * the strip, which returns its input untouched when it removed nothing and so has
 * to copy along the way.
 *
 * A segment naming nothing is passed over rather than reported: the walk only
 * reaches what a validator just read off the very same object.
 */
const removeUnknownKey = ({ target, keyPath }: UnknownKeyRemoval): void => {
	let container: unknown = target;
	for (const segment of keyPath.slice(0, -1)) {
		if (typeof container !== "object" || container === null) {
			return;
		}
		container = (container as Record<string | number, unknown>)[segment];
	}
	if (typeof container !== "object" || container === null) {
		return;
	}
	delete (container as Record<string | number, unknown>)[
		keyPath[keyPath.length - 1]
	];
};

/**
 * Parses a Canvas document string in stages — JSON syntax → unknown-content strip →
 * structure → per-type checks → semantics → unknown-key removal — against the given
 * registry (see the stage table in packages/canvas/docs/03-data-model-and-persistence.md).
 * The one body behind every parser's `parse`, so parsers composed from different type
 * sets share identical `CanvasParseResult` semantics.
 */
const parseDocText = (
	text: string,
	registry: ObjectDocValidatorRegistry,
): CanvasParseResult => {
	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch (e) {
		return {
			kind: "syntax-error",
			message: e instanceof Error ? e.message : "JSON parse error",
		};
	}

	try {
		// Unknown object types and unknown pure-enum values are not errors: the objects are
		// kept as opaque ones and the values stripped here, so the rest of the document still
		// loads, and both are reported as ok.warnings. Everything past this point sees the
		// stripped doc.
		const { data: strippedData, warnings } = stripUnknownContent(
			data,
			registry,
		);

		// If structure validation rejects it (= it does not even hold up as a CanvasDoc), return only
		// the structure errors without proceeding to semantic validation. Structure errors are the kind
		// that a JSON schema can also express, so they are returned as a kind distinct from semantic
		// errors, allowing callers to decide to "defer to the schema and avoid double display".
		const structureResult = checkStructure(strippedData, registry);
		const structureErrors = structureResult.diagnostics.filter(isSemanticError);
		if (structureErrors.length > 0) {
			return { kind: "structure-error", diagnostics: structureErrors };
		}

		// Consistency that can only be determined by traversing the whole document (duplicate IDs,
		// broken references, etc.). These cannot be expressed by a JSON schema, so they are distinguished
		// from structure errors.
		const diagnostics = checkSemantics(strippedData as CanvasDoc, registry);
		const semanticErrors = diagnostics.filter(isSemanticError);
		if (semanticErrors.length > 0) {
			return { kind: "semantic-error", diagnostics: semanticErrors };
		}

		// Only once the document is known to load: an unreadable one is returned as
		// diagnostics alone, so there is nothing to take the fields out of.
		structureResult.unknownKeyRemovals.forEach(removeUnknownKey);

		return {
			kind: "ok",
			doc: strippedData as CanvasDoc,
			warnings: [
				...warnings,
				...structureResult.diagnostics.filter(isSemanticWarning),
				...diagnostics.filter(isSemanticWarning),
			],
		};
	} catch (e) {
		// An unexpected error inside the validator. Propagate it to the caller rather than swallowing it.
		return {
			kind: "internal-error",
			message: e instanceof Error ? e.message : "Unexpected validation error",
		};
	}
};

export type CanvasParser = {
	parse(text: string): CanvasParseResult;
};

/**
 * Builds a {@link CanvasParser} instance backed by its own doc-validator registry
 * ({@link createDocValidatorRegistry}), so parsers that know different type sets — the
 * default one and a plugin-aware one — can coexist in one process.
 *
 * @param config - The definition set to validate against; see
 *   {@link createDocValidatorRegistry}. Omit for the built-in types only.
 */
export const createCanvasParser = (
	config?: DocDefinitionsConfig,
): CanvasParser => {
	const registry = createDocValidatorRegistry(config);
	return {
		parse: (text: string) => parseDocText(text, registry),
	};
};
