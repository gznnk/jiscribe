import { describe, it, expect } from "vitest";

import { createCanvasRegistries } from "../../../../registries/createCanvasRegistries";
import {
	basicStencilCategory,
	type StencilCategory,
} from "../../../objects/StencilCategory";
import { DEFAULT_BOTTOM_TOOLBAR_PRESET_IDS } from "../../BottomToolbar/bottomToolbarPresets";
import {
	DEFAULT_TOOLBAR_HISTORY_SECTION,
	DEFAULT_TOOLBAR_PROPERTIES_SECTION,
	DEFAULT_TOOLBAR_SECTIONS,
	DEFAULT_TOOLBAR_SIDEBARS_SECTION,
	DEFAULT_TOOLBAR_TOOLS_SECTION,
	DEFAULT_TOOLBAR_VIEW_SECTION,
	type ToolbarItem,
	type ToolbarSection,
} from "../toolbarSections";

/**
 * Every section core exports — the default bar plus the two it no longer holds —
 * and the one category core ships but does not pin.
 */
const ALL_SECTIONS: ToolbarSection[] = [
	...DEFAULT_TOOLBAR_SECTIONS,
	DEFAULT_TOOLBAR_TOOLS_SECTION,
	DEFAULT_TOOLBAR_PROPERTIES_SECTION,
	{
		id: "basic-category",
		items: [{ type: "stencilCategory", category: basicStencilCategory }],
	},
];

const allItems = (sections: readonly ToolbarSection[]): ToolbarItem[] =>
	sections.flatMap((section) => section.items);

const collectPresetIds = (items: readonly ToolbarItem[]): string[] =>
	items.flatMap((item) => {
		if (item.type === "stencilPreset") {
			return [item.presetId];
		}
		return item.type === "stencilCategory" ? item.category.presetIds : [];
	});

describe("DEFAULT_TOOLBAR_SECTIONS", () => {
	it("is history, view and the sidebars switch, in display order", () => {
		expect(DEFAULT_TOOLBAR_SECTIONS).toEqual([
			DEFAULT_TOOLBAR_HISTORY_SECTION,
			DEFAULT_TOOLBAR_VIEW_SECTION,
			DEFAULT_TOOLBAR_SIDEBARS_SECTION,
		]);
	});

	/**
	 * A presetId naming no registered preset is silently skipped at render time,
	 * so a typo or a removed stencil would only show up as a missing button.
	 */
	it("names only presets the default registries actually register", () => {
		const { stencil } = createCanvasRegistries();
		const unresolved = collectPresetIds(allItems(ALL_SECTIONS)).filter(
			(presetId) => stencil.get(presetId) === undefined,
		);
		expect(unresolved).toEqual([]);
	});

	/** Same silence for a commandId: the button would just not be drawn. */
	it("names only commands the default registries actually register", () => {
		const registries = createCanvasRegistries();
		const commandIds = allItems(ALL_SECTIONS).flatMap((item) =>
			item.type === "command" ? [item.commandId] : [],
		);
		expect(commandIds).toEqual(["undo", "redo", "zoomToFit", "shortcutHelp"]);
		expect(
			commandIds.filter(
				(commandId) => registries.command.get(commandId) === undefined,
			),
		).toEqual([]);
	});

	/**
	 * The zoom item names no command in the declaration — ToolbarZoomGroup draws
	 * the three buttons and looks these ids up itself — so nothing else would
	 * catch a rename of one of them.
	 */
	it("has the commands its zoom group drives registered", () => {
		const registries = createCanvasRegistries();
		expect(allItems(ALL_SECTIONS).some((item) => item.type === "zoom")).toBe(
			true,
		);
		for (const commandId of ["zoomOut", "resetZoom", "zoomIn"]) {
			expect(registries.command.get(commandId)).toBeDefined();
		}
	});

	it("lists no preset twice within a single item", () => {
		for (const item of allItems(ALL_SECTIONS)) {
			const presetIds = collectPresetIds([item]);
			expect(presetIds).toHaveLength(new Set(presetIds).size);
		}
	});

	it("reaches every preset of the former shape tools exactly once", () => {
		const presetIds = collectPresetIds(DEFAULT_TOOLBAR_TOOLS_SECTION.items);
		expect(presetIds).toHaveLength(new Set(presetIds).size);
	});

	it("gives every category a unique id", () => {
		const categoryIds = allItems(ALL_SECTIONS).flatMap((item) =>
			item.type === "stencilCategory" ? [item.category.id] : [],
		);
		expect(categoryIds).toHaveLength(new Set(categoryIds).size);
	});

	it("gives every section a unique id", () => {
		const sectionIds = ALL_SECTIONS.map((section) => section.id);
		expect(sectionIds).toHaveLength(new Set(sectionIds).size);
	});

	/** Sections are drawn in array order, so an end-aligned one must come last. */
	it("puts every end-aligned section after every start-aligned one", () => {
		const alignments = DEFAULT_TOOLBAR_SECTIONS.map(
			(section) => section.align ?? "start",
		);
		expect(alignments.lastIndexOf("start")).toBeLessThan(
			alignments.indexOf("end"),
		);
	});

	/** The presets are the bottom tool bar's, so none shows twice. */
	it("pins no preset and opens no category flyout", () => {
		expect(
			allItems(DEFAULT_TOOLBAR_SECTIONS).filter(
				(item) =>
					item.type === "stencilPreset" || item.type === "stencilCategory",
			),
		).toEqual([]);
	});

	it("keeps the former shape tools' presets those of the bottom bar's default", () => {
		const pinned = DEFAULT_TOOLBAR_TOOLS_SECTION.items.flatMap((item) =>
			item.type === "stencilPreset" ? [item.presetId] : [],
		);
		expect(pinned).toEqual([...DEFAULT_BOTTOM_TOOLBAR_PRESET_IDS]);
		expect(pinned).toEqual(["rect", "ellipse", "polygon", "polyline", "text"]);
	});
});

const itemNames = (section: ToolbarSection): string[] =>
	section.items.map((item) =>
		item.type === "command" ? item.commandId : item.type,
	);

describe("the sections of the default bar", () => {
	/** Rule 1: each sidebar control sits at the edge its panel opens on. */
	it("ends the bar with the switch for both sidebars", () => {
		expect(DEFAULT_TOOLBAR_SECTIONS[DEFAULT_TOOLBAR_SECTIONS.length - 1]).toBe(
			DEFAULT_TOOLBAR_SIDEBARS_SECTION,
		);
		expect(DEFAULT_TOOLBAR_SIDEBARS_SECTION.align).toBe("end");
		expect(itemNames(DEFAULT_TOOLBAR_SIDEBARS_SECTION)).toEqual([
			"divider",
			"sidebarsToggle",
		]);
	});

	it("keeps the per-edge toggles at their edges in the sections the default dropped", () => {
		expect(itemNames(DEFAULT_TOOLBAR_TOOLS_SECTION)[0]).toBe(
			"stencilLibraryToggle",
		);
		expect(itemNames(DEFAULT_TOOLBAR_PROPERTIES_SECTION)).toEqual([
			"divider",
			"propertyPanelToggle",
		]);
	});

	/** Rule 2: the document-changing half stays on the start side. */
	it("packs history against the start edge and view against the end", () => {
		expect(DEFAULT_TOOLBAR_HISTORY_SECTION.align).toBeUndefined();
		expect(itemNames(DEFAULT_TOOLBAR_HISTORY_SECTION)).toEqual([
			"divider",
			"undo",
			"redo",
		]);
		expect(DEFAULT_TOOLBAR_VIEW_SECTION.align).toBe("end");
		expect(itemNames(DEFAULT_TOOLBAR_VIEW_SECTION)).toEqual([
			"zoom",
			"zoomToFit",
			"divider",
			"shortcutHelp",
		]);
	});

	it("gives every command button an icon", () => {
		for (const item of allItems(ALL_SECTIONS)) {
			if (item.type === "command") {
				// Icons are memo()-wrapped, so they are objects rather than functions.
				expect(item.icon).toBeTruthy();
			}
		}
	});
});

describe("basicStencilCategory", () => {
	it.each([["basic", basicStencilCategory]] as [string, StencilCategory][])(
		"declares %s as a non-empty category",
		(id, category) => {
			expect(category.id).toBe(id);
			expect(category.presetIds.length).toBeGreaterThan(0);
			// Icons are memo()-wrapped, so they are objects rather than functions.
			expect(category.icon).toBeTruthy();
		},
	);

	it("carries an English and Japanese label", () => {
		expect(typeof basicStencilCategory.label).toBe("object");
		expect(basicStencilCategory.label).toMatchObject({
			en: expect.any(String),
			ja: expect.any(String),
		});
	});
});
