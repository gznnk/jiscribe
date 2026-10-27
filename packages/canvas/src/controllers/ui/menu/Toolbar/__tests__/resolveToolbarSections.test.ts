import { describe, it, expect } from "vitest";

import { createCanvasRegistries } from "../../../../registries/createCanvasRegistries";
import { RectIcon } from "../../../objects/primitives/RectIcon";
import { basicStencilCategory } from "../../../objects/StencilCategory";
import {
	DEFAULT_TOOLBAR_HELP_SECTION,
	DEFAULT_TOOLBAR_HISTORY_SECTION,
	DEFAULT_TOOLBAR_PER_SIDEBAR_TOGGLES_SECTION,
	DEFAULT_TOOLBAR_PROPERTIES_SECTION,
	DEFAULT_TOOLBAR_SECTIONS,
	DEFAULT_TOOLBAR_SIDEBARS_SECTION,
	DEFAULT_TOOLBAR_TOOLS_SECTION,
	DEFAULT_TOOLBAR_VIEW_SECTION,
	type ToolbarSection,
} from "../toolbarSections";
import {
	resolveToolbarSections,
	type ToolbarResolutionContext,
} from "../utils/resolveToolbarSections";

const createContext = (commandsConfig?: string[]): ToolbarResolutionContext => {
	const registries = createCanvasRegistries(
		commandsConfig ? { commands: commandsConfig } : undefined,
	);
	return {
		stencil: registries.stencil,
		command: registries.command,
	};
};

const itemTypes = (
	sections: ReturnType<typeof resolveToolbarSections>,
): string[][] => sections.map((section) => section.items.map((i) => i.type));

describe("resolveToolbarSections", () => {
	/**
	 * The history section opens the default bar, so its leading divider would
	 * separate the bar from nothing; it goes, and nothing else does.
	 */
	it("resolves the default bar with only its opening divider dropped", () => {
		const resolved = resolveToolbarSections(
			DEFAULT_TOOLBAR_SECTIONS,
			createContext(),
		);
		expect(resolved.map((section) => [section.id, section.align])).toEqual([
			["history", "start"],
			["view", "end"],
			["help", "end"],
			["per-sidebar-toggles", "end"],
			["sidebars", "end"],
		]);
		expect(itemTypes(resolved)).toEqual([
			["command", "command"],
			["zoom", "command"],
			["divider", "command"],
			["divider", "stencilLibraryToggle", "propertyPanelToggle"],
			["divider", "sidebarsToggle"],
		]);
	});

	/** The bar the default used to be, which a host can still compose. */
	const FORMER_DEFAULT_SECTIONS: ToolbarSection[] = [
		DEFAULT_TOOLBAR_TOOLS_SECTION,
		DEFAULT_TOOLBAR_HISTORY_SECTION,
		DEFAULT_TOOLBAR_VIEW_SECTION,
		DEFAULT_TOOLBAR_HELP_SECTION,
		DEFAULT_TOOLBAR_PROPERTIES_SECTION,
	];

	it("keeps the tools-first bar intact when everything resolves", () => {
		const resolved = resolveToolbarSections(
			FORMER_DEFAULT_SECTIONS,
			createContext(),
		);
		expect(itemTypes(resolved)).toEqual([
			[
				"stencilLibraryToggle",
				"divider",
				"stencilPreset",
				"stencilPreset",
				"stencilPreset",
				"stencilPreset",
				"stencilPreset",
			],
			["divider", "command", "command"],
			["zoom", "command"],
			["divider", "command"],
			["divider", "propertyPanelToggle"],
		]);
	});

	/**
	 * The section is nothing but the two commands and the divider that joins them
	 * to the tools, so switching both off has to take the divider with them rather
	 * than leave a hairline floating between the tools and the free space.
	 */
	it("drops the whole history section when undo and redo are switched off", () => {
		const resolved = resolveToolbarSections(
			FORMER_DEFAULT_SECTIONS,
			// `commands` restricts the registry, which is how a host switches one off.
			createContext([
				"shortcutHelp",
				"zoomToFit",
				"zoomIn",
				"zoomOut",
				"resetZoom",
			]),
		);
		expect(resolved.map((section) => section.id)).toEqual([
			"tools",
			"view",
			"help",
			"properties",
		]);
	});

	it("drops the sidebars switch, and its section, when toggleSidebars is switched off", () => {
		const resolved = resolveToolbarSections(
			DEFAULT_TOOLBAR_SECTIONS,
			createContext(["undo", "redo", "zoomIn"]),
		);
		expect(resolved.map((section) => section.id)).toEqual([
			"history",
			"view",
			"per-sidebar-toggles",
		]);
	});

	/** The library always has something to show (see the `stencilLibrary` prop). */
	it("keeps the library toggle and the switch, with no library state to consult", () => {
		const sections: ToolbarSection[] = [
			DEFAULT_TOOLBAR_PER_SIDEBAR_TOGGLES_SECTION,
			DEFAULT_TOOLBAR_SIDEBARS_SECTION,
		];
		expect(
			itemTypes(resolveToolbarSections(sections, createContext())),
		).toEqual([
			["stencilLibraryToggle", "propertyPanelToggle"],
			["divider", "sidebarsToggle"],
		]);
	});

	it("drops a divider closing the whole bar", () => {
		const sections: ToolbarSection[] = [
			{
				id: "tools",
				items: [
					{ type: "stencilPreset", presetId: "rect" },
					{ type: "divider" },
				],
			},
		];
		expect(
			itemTypes(resolveToolbarSections(sections, createContext())),
		).toEqual([["stencilPreset"]]);
	});

	it("drops a preset the registry does not know", () => {
		const sections: ToolbarSection[] = [
			{
				id: "tools",
				items: [
					{ type: "stencilPreset", presetId: "rect" },
					{ type: "stencilPreset", presetId: "no-such-preset" },
				],
			},
		];
		const resolved = resolveToolbarSections(sections, createContext());
		expect(itemTypes(resolved)).toEqual([["stencilPreset"]]);
	});

	it("drops a command the registry does not know", () => {
		const sections: ToolbarSection[] = [
			{
				id: "view",
				items: [
					{ type: "command", commandId: "undo", icon: RectIcon },
					{ type: "command", commandId: "redo", icon: RectIcon },
				],
			},
		];
		// `commands` restricts the registry, which is how a host switches one off.
		const resolved = resolveToolbarSections(sections, createContext(["undo"]));
		expect(resolved[0].items).toHaveLength(1);
	});

	it("keeps a category nested and resolves its presets in declared order", () => {
		const sections: ToolbarSection[] = [
			{
				id: "tools",
				items: [{ type: "stencilCategory", category: basicStencilCategory }],
			},
		];
		const [section] = resolveToolbarSections(sections, createContext());
		const item = section.items[0];
		expect(item.type).toBe("stencilCategory");
		if (item.type === "stencilCategory") {
			expect(item.category).toBe(basicStencilCategory);
			expect(item.presets.map((preset) => preset.id)).toEqual(
				basicStencilCategory.presetIds,
			);
		}
	});

	it("collapses a doubled divider into one", () => {
		const sections: ToolbarSection[] = [
			{
				id: "tools",
				items: [
					{ type: "stencilPreset", presetId: "rect" },
					{ type: "divider" },
					{ type: "divider" },
					{ type: "stencilPreset", presetId: "ellipse" },
				],
			},
		];
		const resolved = resolveToolbarSections(sections, createContext());
		expect(itemTypes(resolved)).toEqual([
			["stencilPreset", "divider", "stencilPreset"],
		]);
	});

	/**
	 * The pattern `toolbar.leading` used to draw for free: a host slot followed
	 * by the boundary with the shape tools.
	 */
	it("keeps a divider the host declared at an end of the section", () => {
		const sections: ToolbarSection[] = [
			{
				id: "file",
				items: [
					{ type: "slot", id: "file-io", node: null },
					{ type: "divider" },
				],
			},
			// Across the free space, so the two dividers do not meet.
			{
				id: "settings",
				align: "end",
				items: [
					{ type: "divider" },
					{ type: "slot", id: "settings", node: null },
				],
			},
		];
		const resolved = resolveToolbarSections(sections, createContext());
		expect(itemTypes(resolved)).toEqual([
			["slot", "divider"],
			["divider", "slot"],
		]);
	});

	/**
	 * A slot section closing with a divider, then the history section opening
	 * with one, both on the start side.
	 */
	it("keeps one divider where two neighbouring sections each bring one", () => {
		const sections: ToolbarSection[] = [
			{
				id: "file",
				items: [
					{ type: "slot", id: "file-menu", node: null },
					{ type: "divider" },
				],
			},
			...DEFAULT_TOOLBAR_SECTIONS,
		];
		const resolved = resolveToolbarSections(sections, createContext());
		expect(itemTypes(resolved)).toEqual([
			["slot", "divider"],
			["command", "command"],
			["zoom", "command"],
			["divider", "command"],
			["divider", "stencilLibraryToggle", "propertyPanelToggle"],
			["divider", "sidebarsToggle"],
		]);
	});

	/**
	 * Sections are drawn in array order, and the free space falls only before
	 * the first end-aligned one: a start section declared after an end one sits
	 * right beside it, so its doubled divider goes like any other.
	 */
	it("drops the doubled divider of a start section declared after an end one", () => {
		const sections: ToolbarSection[] = [
			{
				id: "view",
				align: "end",
				items: [{ type: "slot", id: "view", node: null }, { type: "divider" }],
			},
			{
				id: "late",
				items: [{ type: "divider" }, { type: "slot", id: "late", node: null }],
			},
		];
		const resolved = resolveToolbarSections(sections, createContext());
		expect(itemTypes(resolved)).toEqual([["slot", "divider"], ["slot"]]);
	});

	it("drops a section left with nothing but the doubled divider", () => {
		const sections: ToolbarSection[] = [
			{
				id: "tools",
				items: [
					{ type: "stencilPreset", presetId: "rect" },
					{ type: "divider" },
				],
			},
			{ id: "spacer", items: [{ type: "divider" }] },
			{ id: "more", items: [{ type: "stencilPreset", presetId: "ellipse" }] },
		];
		const resolved = resolveToolbarSections(sections, createContext());
		expect(resolved.map((section) => section.id)).toEqual(["tools", "more"]);
	});

	it("drops a divider only stranded at an end by a dropped neighbour", () => {
		const sections: ToolbarSection[] = [
			{
				id: "tools",
				items: [
					{ type: "stencilPreset", presetId: "no-such-preset" },
					{ type: "divider" },
					{ type: "stencilPreset", presetId: "rect" },
					{ type: "divider" },
					{ type: "command", commandId: "no-such-command", icon: RectIcon },
				],
			},
		];
		const resolved = resolveToolbarSections(sections, createContext());
		expect(itemTypes(resolved)).toEqual([["stencilPreset"]]);
	});

	it("drops a section left with nothing but dividers", () => {
		const sections: ToolbarSection[] = [
			{
				id: "empty",
				items: [
					{ type: "divider" },
					{ type: "command", commandId: "no-such-command", icon: RectIcon },
				],
			},
			{ id: "tools", items: [{ type: "stencilPreset", presetId: "rect" }] },
		];
		const resolved = resolveToolbarSections(sections, createContext());
		expect(resolved.map((section) => section.id)).toEqual(["tools"]);
	});

	it("defaults a section with no align to the start edge", () => {
		const sections: ToolbarSection[] = [
			{ id: "tools", items: [{ type: "stencilPreset", presetId: "rect" }] },
		];
		expect(resolveToolbarSections(sections, createContext())[0].align).toBe(
			"start",
		);
	});

	/** A host's own section keeps showing on its side when the bar collapses. */
	it("defaults a section with no collapsedAlign to its align", () => {
		const sections: ToolbarSection[] = [
			{ id: "tools", items: [{ type: "stencilPreset", presetId: "rect" }] },
			{
				id: "settings",
				align: "end",
				items: [{ type: "slot", id: "settings", node: null }],
			},
			{
				id: "hidden",
				align: "end",
				collapsedAlign: "hidden",
				items: [{ type: "slot", id: "hidden", node: null }],
			},
		];
		expect(
			resolveToolbarSections(sections, createContext()).map(
				(section) => section.collapsedAlign,
			),
		).toEqual(["start", "end", "hidden"]);
	});

	/** The id keys the rendered section, so a twin would be invisible, not wrong. */
	it("throws when two sections share an id", () => {
		const sections: ToolbarSection[] = [
			{ id: "tools", items: [{ type: "stencilPreset", presetId: "rect" }] },
			{ id: "tools", items: [{ type: "stencilPreset", presetId: "ellipse" }] },
		];
		expect(() => resolveToolbarSections(sections, createContext())).toThrow(
			/"tools"/,
		);
	});
});
