import { createCanvasRegistries } from "@jiscribe/canvas";
import { describe, expect, it } from "vitest";

import { standardPlugins } from "../index";

/**
 * A selection mixing two types offers only what both offer, section by section
 * and item by item. A type hanging its text below the box offers the label's
 * background, so every such type has to put it under the one section id the
 * others do — the default menus and the icon sets' hand-written ones alike — or
 * selecting a server beside an AWS icon drops the item without a word.
 */
describe("the standard set's label text types", () => {
	const registries = createCanvasRegistries({ plugins: standardPlugins });
	const labelTypes = standardPlugins
		.flatMap((plugin) => Object.entries(plugin.objects ?? {}))
		.filter(([, definition]) => definition?.features.text === "label")
		.map(([type]) => type);

	it("are the twelve shapes drawing their text below the box", () => {
		expect(labelTypes).toHaveLength(12);
		expect(labelTypes).toEqual(
			expect.arrayContaining(["server", "awsIcon", "azureIcon", "gcpIcon"]),
		);
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

	it.each(labelTypes)(
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
