import type { ObjectDocValidatorRegistry } from "../plugin/ObjectDocValidatorRegistry";
import { createObjectDocValidatorRegistry } from "../plugin/ObjectDocValidatorRegistry";
import type { DocDefinitionsConfig } from "../plugin/resolveDocDefinitions";
import { resolveDocDefinitions } from "../plugin/resolveDocDefinitions";

/**
 * Builds a doc-validator registry populated from a resolved definition set. Each call
 * returns a fresh instance, so parsers configured differently never see each other's
 * types.
 *
 * @param config - Resolved by {@link resolveDocDefinitions} (see it for the preset/plugin
 *   merge and duplicate-type semantics). Omit for the built-in set as-is.
 * @returns A registry holding one validator and one `features` entry per resolved type.
 */
export const createDocValidatorRegistry = (
	config?: DocDefinitionsConfig,
): ObjectDocValidatorRegistry => {
	const registry = createObjectDocValidatorRegistry();
	resolveDocDefinitions(config).forEach((definition, type) => {
		registry.register(type, definition.validateDoc, definition.features);
	});
	return registry;
};
