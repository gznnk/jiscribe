import { createCanvasRegistries } from "@jiscribe/canvas";
import { hasLabelFill, isCaptionText } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { standardPlugins } from "../index";

/**
 * A selection mixing two types offers only what both offer, section by section
 * and item by item. A type whose caption carries `labelFill` offers the
 * label's background, so every such type has to put it under the one section id the
 * others do — the default menus and the icon sets' hand-written ones alike — or
 * selecting a server beside an AWS icon drops the item without a word. An
 * `"innerLabel"` caption carries none, so it offers none.
 */
describe("the standard set's caption text types", () => {
	const registries = createCanvasRegistries({ plugins: standardPlugins });
	const definitions = standardPlugins.flatMap((plugin) =>
		Object.entries(plugin.objects ?? {}),
	);
	const captionTypes = definitions
		.filter(([, definition]) => isCaptionText(definition?.features.text))
		.map(([type]) => type);
	const labelTypes = definitions
		.filter(([, definition]) => hasLabelFill(definition?.features.text))
		.map(([type]) => type);
	const innerLabelTypes = captionTypes.filter(
		(type) => !labelTypes.includes(type),
	);

	it("are the sixteen shapes drawing a caption sized from its own text, fifteen of them over a background", () => {
		expect(captionTypes).toHaveLength(16);
		expect(labelTypes).toHaveLength(15);
		expect(labelTypes).toEqual(
			expect.arrayContaining([
				"server",
				"awsIcon",
				"azureIcon",
				"gcpIcon",
				"brace",
				"bracket",
				"bracketWithStem",
			]),
		);
		expect(innerLabelTypes).toEqual(["awsGroup"]);
	});

	it.each(labelTypes)(
		"offers %s's label background under label-style in the floating menu",
		(type) => {
			const section = registries.objectMenu
				.getSections(type)
				.find(({ id }) => id === "label-style");
			expect(section?.items).toContainEqual({ type: "labelBackgroundColor" });
		},
	);

	it.each(labelTypes)(
		"offers %s's label background under label-style in the properties sidebar",
		(type) => {
			const section = registries.propertyPanel
				.getSections(type)
				.find(({ id }) => id === "label-style");
			expect(section?.items).toContainEqual({ type: "labelBackgroundColor" });
		},
	);

	it.each(innerLabelTypes)(
		"offers %s no label background in either surface",
		(type) => {
			const menuItems = registries.objectMenu
				.getSections(type)
				.flatMap(({ items }) => items);
			expect(menuItems).not.toContainEqual({ type: "labelBackgroundColor" });
			const panelItems = registries.propertyPanel
				.getSections(type)
				.flatMap(({ items }) => items);
			expect(panelItems).not.toContainEqual({ type: "labelBackgroundColor" });
		},
	);

	it.each(captionTypes)(
		"offers %s no vertical alignment in either surface",
		(type) => {
			const menuItems = registries.objectMenu
				.getSections(type)
				.flatMap(({ items }) => items);
			expect(menuItems).not.toContainEqual({ type: "textAlignment" });
			const panelItems = registries.propertyPanel
				.getSections(type)
				.flatMap(({ items }) => items);
			expect(panelItems).not.toContainEqual({ type: "verticalAlign" });
		},
	);
});
