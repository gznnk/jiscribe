// The shape types an AI tool is allowed to name, derived from a doc plugin set.
// The enums and the wording in the tool descriptors take this as their source.

import {
	builtinObjectDocDefinitions,
	type CanvasDocPlugin,
	type ObjectDocDefinition,
} from "@jiscribe/doc";

/**
 * The shape types carried on the AI tool schemas. Resolving doc plugins stays on
 * the UI side, and only this list is handed to the host.
 */
export type AiCanvasCapabilities = {
	/** Types that can be created programmatically; used as the add_object enum */
	creatableObjectTypes: readonly string[];
	/** Types either end of a connector may attach to; named in the connect description */
	connectableObjectTypes: readonly string[];
};

/**
 * Derive the shape types to put on the AI tools from a doc plugin set.
 *
 * @param docPlugins - The enabled doc plugins. Built-in shapes are always
 *   included, so pass only the additions; an empty array leaves the built-ins
 *   alone. Must be a **subset** of the set the docOps applying the operations are
 *   built from — a wider set lets an enum pass a type docOps then rejects.
 *   Narrowing is a deliberate choice, for shapes only the host places and the AI
 *   should not draw
 * @returns creatable holds the types that have a factory, connectable the types
 *   whose features.connectable is true; both in built-in then plugin definition order
 */
export const toCanvasCapabilities = (
	docPlugins: readonly CanvasDocPlugin[],
): AiCanvasCapabilities => {
	const allDocDefinitions: Array<[string, ObjectDocDefinition]> = [
		...Object.entries(builtinObjectDocDefinitions),
		...docPlugins.flatMap((plugin) =>
			Object.entries(plugin.objects ?? {}).flatMap(([type, definition]) =>
				definition ? [[type, definition] as [string, ObjectDocDefinition]] : [],
			),
		),
	];
	return {
		creatableObjectTypes: allDocDefinitions
			.filter(([, definition]) => definition.factory !== undefined)
			.map(([type]) => type),
		connectableObjectTypes: allDocDefinitions
			.filter(([, definition]) => definition.features.connectable === true)
			.map(([type]) => type),
	};
};
