import { builtinObjectDocDefinitions } from "../../../../../plugin/builtinObjectDocDefinitions";
import type { ObjectDocDefinition } from "../../../../../plugin/ObjectDocDefinition";
import {
	createObjectFactoryRegistry,
	type ObjectFactoryRegistry,
} from "../../../../../plugin/ObjectFactoryRegistry";
import type { ObjectType } from "../../../types/ObjectType";

const definitions: Readonly<Partial<Record<string, ObjectDocDefinition>>> =
	builtinObjectDocDefinitions;

/**
 * The built-in factories in one registry — the same table `initializeObjectRegistry`
 * fills on the canvas side, minus its UI half. Lets the doc-side creation tests run
 * without a rendering layer.
 */
export const createBuiltinObjectFactoryRegistry = (): ObjectFactoryRegistry => {
	const registry = createObjectFactoryRegistry();
	Object.entries(definitions).forEach(([type, definition]) => {
		if (definition?.factory !== undefined) {
			registry.register(type as ObjectType, definition.factory);
		}
	});

	return registry;
};
