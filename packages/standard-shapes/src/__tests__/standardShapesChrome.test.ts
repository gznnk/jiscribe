import {
	createCanvasRegistries,
	DEFAULT_TOOLBAR_HELP_SECTION,
	DEFAULT_TOOLBAR_HISTORY_SECTION,
	DEFAULT_TOOLBAR_PER_SIDEBAR_TOGGLES_SECTION,
	DEFAULT_TOOLBAR_SIDEBARS_SECTION,
	DEFAULT_TOOLBAR_VIEW_SECTION,
} from "@jiscribe/canvas";
import { describe, expect, it } from "vitest";

import {
	standardStencilBarPresetIds,
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
	it("pins the six presets on the stencil bar, all registered", () => {
		expect(standardStencilBarPresetIds).toEqual([
			"rect",
			"ellipse",
			"polygon",
			"polyline",
			"text",
			"sticky",
		]);
		const { stencil } = createCanvasRegistries({ plugins: standardPlugins });
		expect(
			standardStencilBarPresetIds.filter(
				(presetId) => stencil.get(presetId) === undefined,
			),
		).toEqual([]);
	});

	it("tops the canvas with history, view, help, the sidebar toggles and the sidebars switch, and no shape tool", () => {
		expect(standardToolbarSections).toEqual([
			DEFAULT_TOOLBAR_HISTORY_SECTION,
			DEFAULT_TOOLBAR_VIEW_SECTION,
			DEFAULT_TOOLBAR_HELP_SECTION,
			DEFAULT_TOOLBAR_PER_SIDEBAR_TOGGLES_SECTION,
			DEFAULT_TOOLBAR_SIDEBARS_SECTION,
		]);
		const lastItems = standardToolbarSections.at(-1)?.items ?? [];
		expect(lastItems.at(-1)).toEqual({ type: "sidebarsToggle" });
	});

	it("keeps the former shape tools as the library toggle plus the stencil bar's presets", () => {
		expect(standardToolbarToolsSection.items).toEqual([
			{ type: "stencilLibraryToggle" },
			{ type: "divider" },
			...standardStencilBarPresetIds.map((presetId) => ({
				type: "stencilPreset",
				presetId,
			})),
		]);
	});
});
