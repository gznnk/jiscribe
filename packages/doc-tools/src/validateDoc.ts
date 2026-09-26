import type { CanvasDoc, SemanticDiagnostic } from "@jiscribe/doc";
import { createCanvasParser } from "@jiscribe/doc";
import { standardDocPlugins } from "@jiscribe/standard-shapes/doc";

import type { Diagnostic } from "./Diagnostic";

/** What {@link validateDoc} found, plus the parsed document when nothing failed. */
export type ValidateDocResult = {
	/** True when no diagnostic has `severity: "error"`. */
	ok: boolean;
	/** Every finding the parser reported, in the order it reported them. */
	diagnostics: Diagnostic[];
	/**
	 * The document as the parser read it — unknown properties and enum values
	 * already removed, which is what the warnings report. Present whenever the
	 * parser accepted the text, warnings or not, so a caller can go on diagnosing a
	 * document the canvas would open.
	 */
	doc?: CanvasDoc;
};

let sharedParser: ReturnType<typeof createCanvasParser> | null = null;

const getParser = (): ReturnType<typeof createCanvasParser> => {
	sharedParser ??= createCanvasParser({ plugins: standardDocPlugins });
	return sharedParser;
};

const toSemanticDiagnostics = (
	diagnostics: readonly SemanticDiagnostic[],
	severity: Diagnostic["severity"],
): Diagnostic[] =>
	diagnostics.map((diagnostic) => ({
		severity,
		objectId: diagnostic.id,
		path: diagnostic.path === "" ? undefined : diagnostic.path,
		message: diagnostic.message,
	}));

/**
 * Checks one `.jis` text with the canvas parser loaded with the shipped shape set
 * (`@jiscribe/standard-shapes/doc`) — the very thing that opens the file, so what
 * this reports is what a host will do with the document.
 *
 * Errors are the reasons the document does not open: a JSON syntax error, a field
 * of the wrong type or missing, a broken value, and the cross-object rules no JSON
 * schema can express (duplicate ids, a connector pointing at nothing). A warning is
 * content the parser leaves out instead: an unknown property, an unknown enum value,
 * an object of a type this build does not ship. **The document opens, and the
 * reported field is gone from the file the next time it is saved** — `doc` is
 * already without it.
 *
 * The official JSON schema (`@jiscribe/doc-schema/schema`) is not consulted: it is
 * what an editor completes and validates against, and the parser reports everything
 * it does.
 *
 * @param text - The whole file as text, not a parsed object: a JSON syntax error is one of the results, and it is reported as a single error diagnostic with no path
 * @returns `ok` false when any diagnostic is an error; `doc` is present whenever the parser accepted the text, holding the document with unknown properties and enum values removed and objects of unknown types kept as they are (each reported as a warning)
 */
export const validateDoc = (text: string): ValidateDocResult => {
	const result = getParser().parse(text);
	switch (result.kind) {
		case "ok":
			return {
				ok: true,
				diagnostics: toSemanticDiagnostics(result.warnings, "warning"),
				doc: result.doc,
			};
		case "structure-error":
		case "semantic-error":
			return {
				ok: false,
				diagnostics: toSemanticDiagnostics(result.diagnostics, "error"),
			};
		case "syntax-error":
			return {
				ok: false,
				diagnostics: [
					{
						severity: "error",
						message: `JSON syntax error: ${result.message}`,
					},
				],
			};
		case "internal-error":
			return {
				ok: false,
				diagnostics: [
					{ severity: "error", message: `parser: ${result.message}` },
				],
			};
	}
};
