import type { CanvasDoc } from "../CanvasDoc";
import { stripUnknownContent } from "./stripUnknownContent";
import type { SemanticDiagnostic } from "./types";
import { validateSemantics } from "./validateSemantics";
import { validateStructure } from "./validateStructure";
import type { createObjectDocValidatorRegistry } from "../../registry/ObjectDocValidatorRegistry";

/**
 * Result of parsing a Canvas document string.
 *
 * Represents JSON syntax error / semantic error / unexpected exception during validation / success
 * as a discriminated union. Exceptions are not used for control flow, so callers can handle every
 * case exhaustively via `switch (result.kind)`.
 *
 * `ok.warnings` lists what {@link stripUnknownContent} removed (unknown-type
 * objects with their cascade, and unknown pure-enum values). Empty for a
 * fully-known document. `ok.doc` is the stripped doc, so serializing it is what
 * makes the removal stick on save.
 */
export type CanvasParseResult =
	| { kind: "ok"; doc: CanvasDoc; warnings: SemanticDiagnostic[] }
	| { kind: "syntax-error"; message: string }
	| { kind: "structure-error"; diagnostics: SemanticDiagnostic[] }
	| { kind: "semantic-error"; diagnostics: SemanticDiagnostic[] }
	| { kind: "internal-error"; message: string };

/**
 * Validates a Canvas document string in stages — JSON syntax → unknown-content strip →
 * structure/semantics — against the given registry, and returns the result as a
 * {@link CanvasParseResult}.
 *
 * Shared by `parseCanvasText` (global registry) and `createCanvasParser` (a dedicated
 * per-parser registry) so both go through identical `CanvasParseResult` semantics; only
 * the registry construction/lifecycle differs between the two callers.
 */
export function parseWithRegistry(
	text: string,
	registry: ReturnType<typeof createObjectDocValidatorRegistry>,
): CanvasParseResult {
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
		// Unknown object types (with their cascade — emptied groups, connectors to removed
		// owners) and unknown pure-enum values are not errors: they are stripped here so the
		// rest of the document still loads, and reported as ok.warnings. Everything past
		// this point sees the stripped doc.
		const { data: strippedData, warnings } = stripUnknownContent(
			data,
			registry,
		);

		// If structure validation rejects it (= it does not even hold up as a CanvasDoc), return only
		// the structure errors without proceeding to semantic validation. Structure errors are the kind
		// that a JSON schema can also express, so they are returned as a kind distinct from semantic
		// errors, allowing callers to decide to "defer to the schema and avoid double display".
		const structureErrors = validateStructure(strippedData, registry);
		if (structureErrors.length > 0) {
			return { kind: "structure-error", diagnostics: structureErrors };
		}

		// Consistency that can only be determined by traversing the whole document (duplicate IDs,
		// broken references, etc.). These cannot be expressed by a JSON schema, so they are distinguished
		// from structure errors.
		const diagnostics = validateSemantics(strippedData as CanvasDoc, registry);
		if (diagnostics.length > 0) {
			return { kind: "semantic-error", diagnostics };
		}
		return { kind: "ok", doc: strippedData as CanvasDoc, warnings };
	} catch (e) {
		// An unexpected error inside the validator. Propagate it to the caller rather than swallowing it.
		return {
			kind: "internal-error",
			message: e instanceof Error ? e.message : "Unexpected validation error",
		};
	}
}
