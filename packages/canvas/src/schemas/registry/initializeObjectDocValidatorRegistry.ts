import { builtinObjectDocDefinitions } from "./builtinObjectDocDefinitions";
import type { createObjectDocValidatorRegistry } from "./ObjectDocValidatorRegistry";
import { objectDocValidatorRegistry } from "./ObjectDocValidatorRegistry";

/**
 * Folds {@link builtinObjectDocDefinitions} (one entry per built-in object type)
 * into the given registry, populating each type's doc validator and features.
 *
 * This is a schema-layer-only initialization, all that is needed to "just parse
 * and validate text into a CanvasDoc". It pulls in no UI dependencies such as
 * React / @emotion, so it can be safely called from the Node side of the VSCode
 * extension (the headless entry `./doc`).
 *
 * Parsing does not go through here: `createCanvasParser` builds its own registry from a
 * caller-chosen definition set (which may filter out or replace built-in types). What is
 * left for this function is populating a registry with the built-in set as-is, which the
 * schema-layer unit tests do against the global {@link objectDocValidatorRegistry}.
 */
export const initializeObjectDocValidatorRegistry = (
	registry: ReturnType<
		typeof createObjectDocValidatorRegistry
	> = objectDocValidatorRegistry,
): void => {
	registry.clear();
	for (const [type, definition] of Object.entries(
		builtinObjectDocDefinitions,
	)) {
		registry.register(type, definition.validateDoc, definition.features);
	}
};
