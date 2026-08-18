import type { DocCreationDefaults } from "../types/DocCreationDefaults";

/**
 * Picks the docDefaults entries the shape actually declares in its
 * DOC_DEFAULTS. Spread between the DOC_DEFAULTS and `overrides` so theme
 * defaults replace built-in defaults without adding unsupported fields.
 */
export const pickSupportedDocDefaults = (
	defaults: Record<string, unknown>,
	docDefaults?: DocCreationDefaults,
): Partial<DocCreationDefaults> =>
	docDefaults && "fontFamily" in defaults
		? { fontFamily: docDefaults.fontFamily }
		: {};
