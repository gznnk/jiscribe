import { isSemanticError } from "../../model/types/SemanticDiagnostic";
import type { ObjectDocDefinition } from "../../plugin/ObjectDocDefinition";
import { DocOperationError } from "../errors";

/**
 * Holds a doc to its type's own `validateDoc`, writing nothing.
 *
 * @param doc - The object doc to check, as a plain record
 * @param definition - The type whose `validateDoc` is run
 * @param path - JSON path the diagnostics are reported under: the type name for an object being created, its id for one already in the document
 * @param refusal - What the error opens with, ahead of the diagnostics: `cannot create "rect"`, say
 * @throws {@link DocOperationError} listing every error-severity diagnostic as `path message`, joined by "; "; a warning alone passes
 */
export const requireValidObjectDoc = (
	doc: Readonly<Record<string, unknown>>,
	definition: ObjectDocDefinition,
	path: string,
	refusal: string,
): void => {
	const diagnostics = definition
		.validateDoc(doc as Record<string, unknown>, path)
		.filter(isSemanticError);
	if (diagnostics.length === 0) {
		return;
	}
	throw new DocOperationError(
		`${refusal}: ${diagnostics
			.map((diagnostic) => `${diagnostic.path} ${diagnostic.message}`)
			.join("; ")}`,
	);
};
