import type { CanvasDoc } from "../CanvasDoc";
import { validateSemantics, type SemanticDiagnostic } from "./validateSemantics";
import { validateCanvasDocSchema } from "./validateSchema";

export class CanvasValidationError extends Error {
  constructor(
    message: string,
    public readonly specifics: SemanticDiagnostic[]
  ) {
    super(message);
    this.name = "CanvasValidationError";
  }
}

/**
 * Validates the structure and semantics of a CanvasDoc.
 */
export function validateCanvasDocSemantics(doc: unknown): SemanticDiagnostic[] {
  const schemaErrors = validateCanvasDocSchema(doc);
  if (schemaErrors.length > 0) {
    return schemaErrors;
  }
  return validateSemantics(doc as CanvasDoc);
}

export function parseAndValidateCanvasDoc(data: unknown): CanvasDoc {
  const errors = validateCanvasDocSemantics(data);
  if (errors.length > 0) {
    throw new CanvasValidationError(
      "Validation failed",
      errors
    );
  }

  return data as CanvasDoc;
}

export * from "./validateSemantics";
