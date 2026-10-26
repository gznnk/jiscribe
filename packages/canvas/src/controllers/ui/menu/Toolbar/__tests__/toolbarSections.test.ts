import { describe, it, expect } from "vitest";

import { createCanvasRegistries } from "../../../../registries/createCanvasRegistries";
import {
	basicStencilCategory,
	type StencilCategory,
} from "../../../objects/StencilCategory";
import {
	DEFAULT_TOOLBAR_HISTORY_SECTION,
	DEFAULT_TOOLBAR_PROPERTIES_SECTION,
	DEFAULT_TOOLBAR_SECTIONS,
	DEFAULT_TOOLBAR_VIEW_SECTION,
	type ToolbarItem,
	type ToolbarSection,
} from "../toolbarSections";

const allItems = (sections: readonly ToolbarSection[]): ToolbarItem[] =>
	sections.flatMap((section) => section.items);

describe("DEFAULT_TOOLBAR_SECTIONS", () => {
	it("is the three exported sections, in display order", () => {
		expect(DEFAULT_TOOLBAR_SECTIONS).toEqual([
			DEFAULT_TOOLBAR_HISTORY_SECTION,
			DEFAULT_TOOLBAR_VIEW_SECTION,
			DEFAULT_TOOLBAR_PROPERTIES_SECTION,
		]);
	});

	/** A commandId naming no command is silently skipped: the button would just not be drawn. */
	it("names only commands the default registries actually register", () => {
		const registries = createCanvasRegistries();
		const commandIds = allItems(DEFAULT_TOOLBAR_SECTIONS).flatMap((item) =>
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
		expect(
			allItems(DEFAULT_TOOLBAR_SECTIONS).some((item) => item.type === "zoom"),
		).toBe(true);
		for (const commandId of ["zoomOut", "resetZoom", "zoomIn"]) {
			expect(registries.command.get(commandId)).toBeDefined();
		}
	});

	it("gives every section a unique id", () => {
		const sectionIds = DEFAULT_TOOLBAR_SECTIONS.map((section) => section.id);
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
});

const itemNames = (section: ToolbarSection): string[] =>
	section.items.map((item) =>
		item.type === "command" ? item.commandId : item.type,
	);

describe("the sections of the default bar", () => {
	/** Rule 2: the properties toggle keeps the edge its panel opens on. */
	it("ends the bar with the properties toggle", () => {
		expect(DEFAULT_TOOLBAR_SECTIONS[DEFAULT_TOOLBAR_SECTIONS.length - 1]).toBe(
			DEFAULT_TOOLBAR_PROPERTIES_SECTION,
		);
		expect(itemNames(DEFAULT_TOOLBAR_PROPERTIES_SECTION)).toEqual([
			"divider",
			"propertyPanelToggle",
		]);
	});

	/**
	 * Rule 1: the document-changing half stays on the start side. History opens
	 * the bar, so it carries no leading divider: one declared at a section's end
	 * is kept, and would stand alone at the bar's left edge.
	 */
	it("packs history against the start edge and view against the end", () => {
		expect(DEFAULT_TOOLBAR_HISTORY_SECTION.align).toBeUndefined();
		expect(itemNames(DEFAULT_TOOLBAR_HISTORY_SECTION)).toEqual([
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
		for (const item of allItems(DEFAULT_TOOLBAR_SECTIONS)) {
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
