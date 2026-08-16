import { createDocValidatorRegistry } from "./createDocValidatorRegistry";
import type { CanvasParseResult } from "./parseWithRegistry";
import { parseWithRegistry } from "./parseWithRegistry";
import type { DocDefinitionsConfig } from "../schemas/plugin/resolveDocDefinitions";

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
		parse: (text: string) => parseWithRegistry(text, registry),
	};
};
