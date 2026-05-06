import validate from "./generated-schema-validator.js";
import type { SemanticDiagnostic } from "./validateSemantics";

export function validateCanvasDocSchema(parsedJson: unknown): SemanticDiagnostic[] {
  const valid = validate(parsedJson);
  const errors: SemanticDiagnostic[] = [];

  if (!valid && validate.errors) {
    for (const error of validate.errors) {
      // Map AJV ErrorObject to our SemanticDiagnostic structurally so we can use it in the UI uniformly
      errors.push({
        message: `${error.instancePath || "/"} ${error.message}`,
        path: error.instancePath || "",
        id: "SCHEMA_ERROR"
      });
    }
  }

  return errors;
}