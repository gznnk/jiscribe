import { BODY_TEXT_SLOT_ID, createCanvasRegistries } from "@jiscribe/canvas";
import type { ObjectState } from "@jiscribe/canvas";
import { describe, expect, it } from "vitest";

import { standardPlugins } from "../index";

/**
 * A `"body"` / `"source"` type declares where its text goes twice: on the doc
 * definition, which the headless checks and the auto-height measurement read,
 * and on the UI definition, as the `"textSlot"` part kind the canvas draws and
 * edits in. Nothing ties the two but the shipped shapes passing the same
 * function to both, so this asks the registered kind and the doc declaration
 * the same question for every such type.
 */
describe("the standard set's body text types", () => {
	const registries = createCanvasRegistries({ plugins: standardPlugins });
	const bodyTypes = standardPlugins
		.flatMap((plugin) => Object.entries(plugin.objects ?? {}))
		.flatMap(([type, definition]) =>
			definition !== undefined &&
			(definition.features.text === "body" ||
				definition.features.text === "source")
				? [{ type, definition }]
				: [],
		);

	it("include the shipped body types", () => {
		expect(bodyTypes.map(({ type }) => type)).toEqual(
			expect.arrayContaining(["diamond", "cloud", "container", "callout"]),
		);
	});

	it.each(bodyTypes.map(({ type, definition }) => [type, definition] as const))(
		"draws %s's body in the rectangle its doc definition declares",
		(type, definition) => {
			const doc = definition.factory?.createDoc(
				{ x: 0, y: 0 },
				{ width: 200, height: 100, text: "x" },
			);
			expect(doc).toBeDefined();
			const state = definition.mapper.toState(doc as never) as ObjectState & {
				width: number;
				height: number;
			};
			const region = registries.objectPartKind
				.get(type, "textSlot")
				?.region?.(state, BODY_TEXT_SLOT_ID);

			expect(definition.textRegion).toBeDefined();
			expect(region).toEqual(
				definition.textRegion?.(state as never, BODY_TEXT_SLOT_ID),
			);
		},
	);
});
