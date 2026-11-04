// What BOX_FILLING_TYPES restates about the drawing side, held against it. The
// package itself stays headless; this test alone imports the rendering
// definitions, which is why it sits in a file of its own.
// eslint-disable-next-line no-restricted-imports
import { BUILTIN_OBJECT_DEFINITIONS } from "@jiscribe/canvas";
import { standardPlugins } from "@jiscribe/standard-shapes";
import { standardObjectDocDefinitions } from "@jiscribe/standard-shapes/doc";
import { describe, expect, it } from "vitest";

import { BOX_FILLING_TYPES } from "../occludedObjects";

/**
 * Every shipped type's drawing-side definition: the canvas built-ins and the
 * standard set's plugins, as a canvas registers them.
 */
const presentationDefinitions = new Map<string, { outline?: unknown }>([
	...Object.entries(BUILTIN_OBJECT_DEFINITIONS),
	...standardPlugins.flatMap((plugin) =>
		Object.entries(plugin.objects ?? {}).flatMap(([type, definition]) =>
			definition === undefined ? [] : [[type, definition] as const],
		),
	),
]);

describe("BOX_FILLING_TYPES", () => {
	it.each([...BOX_FILLING_TYPES])(
		"%s is a shipped type with a fill",
		(type) => {
			expect(standardObjectDocDefinitions.get(type)?.features.fill).toBe(true);
		},
	);

	it.each([...BOX_FILLING_TYPES])(
		"%s is drawn with its box as its outline, declaring none of its own",
		(type) => {
			const definition = presentationDefinitions.get(type);
			expect(definition).toBeDefined();
			expect(definition?.outline).toBeUndefined();
		},
	);
});
