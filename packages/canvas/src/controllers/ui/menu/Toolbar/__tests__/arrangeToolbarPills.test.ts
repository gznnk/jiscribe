import { describe, it, expect } from "vitest";

import { createCanvasRegistries } from "../../../../registries/createCanvasRegistries";
import {
	DEFAULT_TOOLBAR_SECTIONS,
	type ToolbarSection,
} from "../toolbarSections";
import {
	arrangeToolbarPills,
	type ToolbarPills,
} from "../utils/arrangeToolbarPills";
import { resolveToolbarSections } from "../utils/resolveToolbarSections";

const arrange = (sections: ToolbarSection[]): ToolbarPills => {
	const registries = createCanvasRegistries();
	return arrangeToolbarPills(
		resolveToolbarSections(sections, {
			stencil: registries.stencil,
			command: registries.command,
		}),
	);
};

/** Each pill flattened to its items, a command by its id, the rest by type. */
const pillItemNames = (pills: ToolbarPills) => ({
	start: pills.start.flatMap((section) =>
		section.items.map((item) =>
			item.type === "command" ? item.commandId : item.type,
		),
	),
	end: pills.end.flatMap((section) =>
		section.items.map((item) =>
			item.type === "command" ? item.commandId : item.type,
		),
	),
});

/** A section holding one host slot and the dividers the host put around it. */
const slotSection = (
	id: string,
	collapsedAlign: ToolbarSection["collapsedAlign"],
	dividers: { before?: boolean; after?: boolean } = {},
): ToolbarSection => ({
	id,
	align: "end",
	collapsedAlign,
	items: [
		...(dividers.before ? [{ type: "divider" as const }] : []),
		{ type: "slot", id, node: null },
		...(dividers.after ? [{ type: "divider" as const }] : []),
	],
});

describe("arrangeToolbarPills", () => {
	it("splits the default bar into history and view + the switch, without help", () => {
		const pills = arrange(DEFAULT_TOOLBAR_SECTIONS);
		expect(pills.start.map((section) => section.id)).toEqual(["history"]);
		expect(pills.end.map((section) => section.id)).toEqual([
			"view",
			"sidebars",
		]);
		expect(pillItemNames(pills)).toEqual({
			start: ["undo", "redo"],
			end: ["zoom", "zoomToFit", "divider", "sidebarsToggle"],
		});
	});

	/** A slot section closing with a divider, among others bringing their own. */
	it("puts exactly one divider between neighbours, whatever their own edge dividers", () => {
		const pills = arrange([
			{
				id: "file",
				items: [{ type: "slot", id: "file", node: null }, { type: "divider" }],
			},
			slotSection("a", "end", { after: true }),
			slotSection("b", "end", { before: true, after: true }),
			slotSection("c", "end"),
			slotSection("d", "start", { before: true }),
		]);
		expect(pillItemNames(pills)).toEqual({
			start: ["slot", "divider", "slot"],
			end: ["slot", "divider", "slot", "divider", "slot"],
		});
	});

	it("keeps the dividers inside a section", () => {
		const pills = arrange([
			{
				id: "tools",
				items: [
					{ type: "divider" },
					{ type: "stencilPreset", presetId: "rect" },
					{ type: "divider" },
					{ type: "stencilPreset", presetId: "ellipse" },
				],
			},
		]);
		expect(pillItemNames(pills).start).toEqual([
			"stencilPreset",
			"divider",
			"stencilPreset",
		]);
	});

	it("leaves a pill empty when no section goes into it", () => {
		const pills = arrange([
			slotSection("a", "end"),
			slotSection("b", "hidden", { before: true }),
		]);
		expect(pills.start).toEqual([]);
		expect(pills.end.map((section) => section.id)).toEqual(["a"]);
	});

	it("follows the array order within a pill, not the full bar's align", () => {
		const pills = arrange([
			slotSection("late", "start"),
			{
				id: "early",
				collapsedAlign: "start",
				items: [{ type: "slot", id: "early", node: null }],
			},
		]);
		expect(pills.start.map((section) => section.id)).toEqual(["late", "early"]);
	});
});
