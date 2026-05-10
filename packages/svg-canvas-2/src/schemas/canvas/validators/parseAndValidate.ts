import type { CanvasDoc } from "../CanvasDoc";
import type { SemanticDiagnostic } from "./types";
import { validateSemantics } from "./validateSemantics";
import { validateStructure } from "./validateStructure";

export class CanvasValidationError extends Error {
	constructor(
		message: string,
		public readonly specifics: SemanticDiagnostic[],
	) {
		super(message);
		this.name = "CanvasValidationError";
	}
}

export function validateCanvasDocSemantics(doc: unknown): SemanticDiagnostic[] {
	const structureErrors = validateStructure(doc);
	if (structureErrors.length > 0) {
		return structureErrors;
	}
	return validateSemantics(doc as CanvasDoc);
}

export function parseAndValidateCanvasDoc(data: unknown): CanvasDoc {
	const errors = validateCanvasDocSemantics(data);
	if (errors.length > 0) {
		throw new CanvasValidationError("Validation failed", errors);
	}
	return data as CanvasDoc;
}
