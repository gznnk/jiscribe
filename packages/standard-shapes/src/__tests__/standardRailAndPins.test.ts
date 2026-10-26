import { createCanvasRegistries } from "@jiscribe/canvas";
import { describe, expect, it } from "vitest";

import {
	standardDefaultPinnedCategoryIds,
	standardPlugins,
	standardRailPresetIds,
	standardStencilLibrarySections,
} from "..";

/**
 * Hosts mount the standard set's rail, library and default pins as they are.
 * The canvas drops what they name and cannot find without a word, so a pin or
 * a rail preset naming nothing would only show up as a missing button.
 */
describe("the standard set's rail and pins", () => {
	it("pins flowchart, general and container, in that order", () => {
		expect(standardDefaultPinnedCategoryIds).toEqual([
			"flowchart",
			"general",
			"container",
		]);
	});

	it("pins only ids that name a section of the standard library", () => {
		const sectionIds = standardStencilLibrarySections.map(
			(section) => section.id,
		);
		expect(
			standardDefaultPinnedCategoryIds.filter(
				(categoryId) => !sectionIds.includes(categoryId),
			),
		).toEqual([]);
	});

	it("puts only presets core or the standard plugins register on the rail", () => {
		const { stencil } = createCanvasRegistries({ plugins: standardPlugins });
		expect(
			standardRailPresetIds.filter(
				(presetId) => stencil.get(presetId) === undefined,
			),
		).toEqual([]);
	});
});
