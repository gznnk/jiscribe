import { createCanvasRegistries } from "@jiscribe/canvas";
import {
	standardDefaultPinnedCategoryIds,
	standardPlugins,
	standardRailPresetIds,
	standardStencilLibrarySections,
} from "@jiscribe/standard-shapes";
import { describe, expect, it } from "vitest";

/**
 * The webview mounts the standard set's rail, library and default pins as they
 * are. The canvas drops what they name and cannot find without a word, so a pin
 * or a rail preset naming nothing would only show up as a missing button.
 * Here rather than in @jiscribe/standard-shapes, which runs no unit tests.
 */
describe("the standard set's rail and pins", () => {
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
