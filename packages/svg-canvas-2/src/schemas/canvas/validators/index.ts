import type { CanvasDoc } from "../CanvasDoc";
import { validateSemantics, type SemanticDiagnostic } from "./validateSemantics";

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
 * Validates the parsed structure of a CanvasDoc
 * ensuring it satisfies logical constraints like ID uniqueness.
 */
export function validateCanvasDocSemantics(doc: CanvasDoc): SemanticDiagnostic[] {
  return validateSemantics(doc);
}

export function parseAndValidateCanvasDoc(data: unknown): CanvasDoc {
  // A robust JSON schema check would go here if AJV was used.
  // We'll assume structure is mostly ok since VSCode handles JSON Schema.
  const doc = data as CanvasDoc;

  const semanticErrors = validateSemantics(doc);
  if (semanticErrors.length > 0) {
    throw new CanvasValidationError(
      "Semantic validation failed (e.g. duplicate IDs or missing references)",
      semanticErrors
    );
  }

  return doc;
}

export * from "./validateSemantics";
