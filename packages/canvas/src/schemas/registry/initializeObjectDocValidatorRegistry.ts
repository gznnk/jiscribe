import { defaultObjectParserExtensions } from "./defaultObjectParserExtensions";
import type { createObjectDocValidatorRegistry } from "./ObjectDocValidatorRegistry";
import { objectDocValidatorRegistry } from "./ObjectDocValidatorRegistry";

/**
 * Folds {@link defaultObjectParserExtensions} (one entry per built-in object type)
 * into the given registry, populating each type's doc validator and features.
 *
 * This is a schema-layer-only initialization, all that is needed to "just parse
 * and validate text into a CanvasDoc". It pulls in no UI dependencies such as
 * React / @emotion, so it can be safely called from the Node side of the VSCode
 * extension (the parser-only entry `./parser`).
 *
 * Defaults to the global {@link objectDocValidatorRegistry} and is populated lazily
 * at parse time: the only production caller of the no-arg form is
 * {@link import("../canvas/validators/parseCanvasText").parseCanvasText}, which
 * calls this idempotently (guarded by `objectDocValidatorRegistry.isEmpty()`) when
 * it needs to validate. The UI-side
 * {@link import("../../controllers/setup/initializeObjectRegistry").initializeObjectRegistry}
 * intentionally does NOT initialize this registry (see the comment there); doc
 * validators are a schema-layer concern needed only during parse-time validation.
 *
 * `createCanvasParser` does not use this function: it builds its own registry from a
 * caller-chosen extension list (which may filter out or replace built-in types).
 */
export const initializeObjectDocValidatorRegistry = (
	registry: ReturnType<
		typeof createObjectDocValidatorRegistry
	> = objectDocValidatorRegistry,
): void => {
	registry.clear();
	defaultObjectParserExtensions.forEach((extension) => {
		registry.register(
			extension.type,
			extension.validateDoc,
			extension.features,
		);
	});
};
