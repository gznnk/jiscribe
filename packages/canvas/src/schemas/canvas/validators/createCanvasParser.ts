import type { CanvasParseResult } from "./parseWithRegistry";
import { parseWithRegistry } from "./parseWithRegistry";
import type { DocDefinitionsConfig } from "../../plugin/resolveDocDefinitions";
import { resolveDocDefinitions } from "../../plugin/resolveDocDefinitions";
import { createObjectDocValidatorRegistry } from "../../registry/ObjectDocValidatorRegistry";

export type CanvasParser = {
	parse(text: string): CanvasParseResult;
};

/**
 * Builds a {@link CanvasParser} instance backed by its own doc-validator registry, so
 * multiple parsers (e.g. the default one and a plugin-aware one) can coexist without
 * mutating shared global state.
 *
 * `config` is resolved by {@link resolveDocDefinitions} (see it for the preset/plugin
 * merge and duplicate-type semantics).
 */
export const createCanvasParser = (
	config?: DocDefinitionsConfig,
): CanvasParser => {
	const definitions = resolveDocDefinitions(config, "createCanvasParser");

	const registry = createObjectDocValidatorRegistry();
	definitions.forEach((definition, type) => {
		registry.register(type, definition.validateDoc, definition.features);
	});

	return {
		parse: (text: string) => parseWithRegistry(text, registry),
	};
};
