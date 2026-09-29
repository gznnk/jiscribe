import type { SemanticDiagnostic } from "../model/types/SemanticDiagnostic";

/**
 * One type's own check of a doc of it: the values it holds, and the rules only
 * that type knows. Which field *names* it may hold is not its business — the
 * registry answers that from the type's definition (see
 * {@link import("./ObjectDocValidatorRegistry").ObjectDocValidatorRegistry}).
 *
 * Kept in a file of its own so the definition can name it without the registry
 * having to import the definition back (see `pnpm dep:check`).
 */
export type ObjectDocValidateFn = (
	obj: Record<string, unknown>,
	path: string,
) => SemanticDiagnostic[];
