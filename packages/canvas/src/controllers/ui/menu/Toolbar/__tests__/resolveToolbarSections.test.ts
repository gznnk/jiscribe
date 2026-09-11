import { describe, it, expect } from "vitest";

import { createCanvasRegistries } from "../../../../registries/createCanvasRegistries";
import { RectIcon } from "../../../objects/primitives/RectIcon";
import { basicStencilCategory } from "../../../objects/StencilCategory";
import {
	DEFAULT_TOOLBAR_SECTIONS,
	type ToolbarSection,
} from "../toolbarSections";
import {
	collectToolbarCommandIds,
	resolveToolbarSections,
	type ToolbarResolutionContext,
} from "../utils/resolveToolbarSections";

const createContext = (
	hasLibrary: boolean,
	commandsConfig?: string[],
): ToolbarResolutionContext => {
	const registries = createCanvasRegistries(
		commandsConfig ? { commands: commandsConfig } : undefined,
	);
	return {
		stencil: registries.stencil,
		command: registries.command,
		hasLibrary,
	};
};

const itemTypes = (
	sections: ReturnType<typeof resolveToolbarSections>,
): string[][] => sections.map((section) => section.items.map((i) => i.type));

describe("resolveToolbarSections", () => {
	it("keeps the default bar intact when everything resolves", () => {
		const resolved = resolveToolbarSections(
			DEFAULT_TOOLBAR_SECTIONS,
			createContext(true),
		);
		expect(resolved.map((section) => [section.id, section.align])).toEqual([
			["tools", "start"],
			["view", "end"],
		]);
		expect(itemTypes(resolved)).toEqual([
			[
				"stencilPreset",
				"stencilPreset",
				"stencilPreset",
				"stencilPreset",
				"stencilPreset",
				"divider",
				"stencilLibraryToggle",
			],
			[
				"command",
				"command",
				"divider",
				"zoom",
				"divider",
				"command",
				"propertyPanelToggle",
			],
		]);
	});

	it("drops the library toggle and its now-trailing divider without a library", () => {
		const resolved = resolveToolbarSections(
			DEFAULT_TOOLBAR_SECTIONS,
			createContext(false),
		);
		expect(itemTypes(resolved)[0]).toEqual([
			"stencilPreset",
			"stencilPreset",
			"stencilPreset",
			"stencilPreset",
			"stencilPreset",
		]);
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
		const resolved = resolveToolbarSections(sections, createContext(true));
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
		const resolved = resolveToolbarSections(
			sections,
			createContext(true, ["undo"]),
		);
		expect(resolved[0].items).toHaveLength(1);
	});

	it("keeps a category nested and resolves its presets in declared order", () => {
		const sections: ToolbarSection[] = [
			{
				id: "tools",
				items: [{ type: "stencilCategory", category: basicStencilCategory }],
			},
		];
		const [section] = resolveToolbarSections(sections, createContext(true));
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
		const resolved = resolveToolbarSections(sections, createContext(true));
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
			{
				id: "settings",
				items: [
					{ type: "divider" },
					{ type: "slot", id: "settings", node: null },
				],
			},
		];
		const resolved = resolveToolbarSections(sections, createContext(true));
		expect(itemTypes(resolved)).toEqual([
			["slot", "divider"],
			["divider", "slot"],
		]);
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
					{ type: "stencilLibraryToggle" },
				],
			},
		];
		const resolved = resolveToolbarSections(sections, createContext(false));
		expect(itemTypes(resolved)).toEqual([["stencilPreset"]]);
	});

	it("drops a section left with nothing but dividers", () => {
		const sections: ToolbarSection[] = [
			{
				id: "empty",
				items: [{ type: "divider" }, { type: "stencilLibraryToggle" }],
			},
			{ id: "tools", items: [{ type: "stencilPreset", presetId: "rect" }] },
		];
		const resolved = resolveToolbarSections(sections, createContext(false));
		expect(resolved.map((section) => section.id)).toEqual(["tools"]);
	});

	it("defaults a section with no align to the start edge", () => {
		const sections: ToolbarSection[] = [
			{ id: "tools", items: [{ type: "stencilPreset", presetId: "rect" }] },
		];
		expect(resolveToolbarSections(sections, createContext(true))[0].align).toBe(
			"start",
		);
	});

	/** The id keys the rendered section, so a twin would be invisible, not wrong. */
	it("throws when two sections share an id", () => {
		const sections: ToolbarSection[] = [
			{ id: "tools", items: [{ type: "stencilPreset", presetId: "rect" }] },
			{ id: "tools", items: [{ type: "stencilPreset", presetId: "ellipse" }] },
		];
		expect(() => resolveToolbarSections(sections, createContext(true))).toThrow(
			/"tools"/,
		);
	});
});

describe("collectToolbarCommandIds", () => {
	it("reads the zoom group as its two commands and sorts the result", () => {
		expect(collectToolbarCommandIds(DEFAULT_TOOLBAR_SECTIONS)).toEqual([
			"redo",
			"shortcutHelp",
			"undo",
			"zoomIn",
			"zoomOut",
		]);
	});

	it("names a command only once however often it appears", () => {
		const sections: ToolbarSection[] = [
			{
				id: "a",
				items: [
					{ type: "command", commandId: "undo", icon: RectIcon },
					{ type: "zoom" },
				],
			},
			{
				id: "b",
				items: [
					{ type: "command", commandId: "undo", icon: RectIcon },
					{ type: "zoom" },
				],
			},
		];
		expect(collectToolbarCommandIds(sections)).toEqual([
			"undo",
			"zoomIn",
			"zoomOut",
		]);
	});

	it("returns nothing for a bar with no command on it", () => {
		expect(
			collectToolbarCommandIds([
				{ id: "tools", items: [{ type: "stencilPreset", presetId: "rect" }] },
			]),
		).toEqual([]);
	});
});
