import {
	createCanvasRegistries,
	DEFAULT_TOOLBAR_HELP_SECTION,
	DEFAULT_TOOLBAR_HISTORY_SECTION,
	DEFAULT_TOOLBAR_SIDEBARS_SECTION,
	DEFAULT_TOOLBAR_VIEW_SECTION,
} from "@jiscribe/canvas";
import { describe, expect, it } from "vitest";

import {
	standardBottomToolbarPresetIds,
	standardPlugins,
	standardToolbarSections,
	standardToolbarToolsSection,
} from "../index";

/**
 * Hosts mount the standard set's bars as they are. The canvas drops a preset id
 * that names nothing without a word, so a typo would only show up as a missing
 * button.
 */
describe("the standard set's bars", () => {
	it("pins the six presets on the bottom bar, all registered", () => {
		expect(standardBottomToolbarPresetIds).toEqual([
			"rect",
			"ellipse",
			"polygon",
			"polyline",
			"text",
			"sticky",
		]);
		const { stencil } = createCanvasRegistries({ plugins: standardPlugins });
		expect(
			standardBottomToolbarPresetIds.filter(
				(presetId) => stencil.get(presetId) === undefined,
			),
		).toEqual([]);
	});

	it("tops the canvas with history, view, help and the sidebars switch, and no shape tool", () => {
		expect(standardToolbarSections).toEqual([
			DEFAULT_TOOLBAR_HISTORY_SECTION,
			DEFAULT_TOOLBAR_VIEW_SECTION,
			DEFAULT_TOOLBAR_HELP_SECTION,
			DEFAULT_TOOLBAR_SIDEBARS_SECTION,
		]);
		const lastItems = standardToolbarSections.at(-1)?.items ?? [];
		expect(lastItems.at(-1)).toEqual({ type: "sidebarsToggle" });
	});

	it("keeps the former shape tools as the library toggle plus the bottom bar's presets", () => {
		expect(standardToolbarToolsSection.items).toEqual([
			{ type: "stencilLibraryToggle" },
			{ type: "divider" },
			...standardBottomToolbarPresetIds.map((presetId) => ({
				type: "stencilPreset",
				presetId,
			})),
		]);
	});
});
