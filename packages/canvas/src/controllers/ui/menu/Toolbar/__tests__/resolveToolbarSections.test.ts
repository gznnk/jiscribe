import { describe, it, expect } from "vitest";

import { createCanvasRegistries } from "../../../../registries/createCanvasRegistries";
import { RectIcon } from "../../../objects/primitives/RectIcon";
import {
	DEFAULT_TOOLBAR_SECTIONS,
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
	return { command: registries.command };
};

const itemTypes = (
	sections: ReturnType<typeof resolveToolbarSections>,
): string[][] => sections.map((section) => section.items.map((i) => i.type));

/** A command item; the icon is irrelevant to resolution. */
const commandItem = (commandId: string): ToolbarSection["items"][number] => ({
	type: "command",
	commandId,
	icon: RectIcon,
});

describe("resolveToolbarSections", () => {
	it("keeps the default bar intact when everything resolves", () => {
		const resolved = resolveToolbarSections(
			DEFAULT_TOOLBAR_SECTIONS,
			createContext(),
		);
		expect(resolved.map((section) => [section.id, section.align])).toEqual([
			["history", "start"],
			["view", "end"],
			["properties", "end"],
		]);
		expect(itemTypes(resolved)).toEqual([
			["command", "command"],
			["zoom", "command", "divider", "command"],
			["divider", "propertyPanelToggle"],
		]);
	});

	it("drops the whole history section when undo and redo are switched off", () => {
		const resolved = resolveToolbarSections(
			DEFAULT_TOOLBAR_SECTIONS,
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
			"view",
			"properties",
		]);
	});

	it("drops a command the registry does not know", () => {
		const sections: ToolbarSection[] = [
			{ id: "view", items: [commandItem("undo"), commandItem("redo")] },
		];
		// `commands` restricts the registry, which is how a host switches one off.
		const resolved = resolveToolbarSections(sections, createContext(["undo"]));
		expect(resolved[0].items).toHaveLength(1);
	});

	it("collapses a doubled divider into one", () => {
		const sections: ToolbarSection[] = [
			{
				id: "history",
				items: [
					commandItem("undo"),
					{ type: "divider" },
					{ type: "divider" },
					commandItem("redo"),
				],
			},
		];
		const resolved = resolveToolbarSections(sections, createContext());
		expect(itemTypes(resolved)).toEqual([["command", "divider", "command"]]);
	});

	/** The pattern of a host file menu: a slot followed by the boundary with history. */
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
		const resolved = resolveToolbarSections(sections, createContext());
		expect(itemTypes(resolved)).toEqual([
			["slot", "divider"],
			["divider", "slot"],
		]);
	});

	it("drops a divider only stranded at an end by a dropped neighbour", () => {
		const sections: ToolbarSection[] = [
			{
				id: "history",
				items: [
					commandItem("no-such-command"),
					{ type: "divider" },
					commandItem("undo"),
					{ type: "divider" },
					commandItem("no-such-command-either"),
				],
			},
		];
		const resolved = resolveToolbarSections(sections, createContext());
		expect(itemTypes(resolved)).toEqual([["command"]]);
	});

	it("drops a section left with nothing but dividers", () => {
		const sections: ToolbarSection[] = [
			{
				id: "empty",
				items: [{ type: "divider" }, commandItem("no-such-command")],
			},
			{ id: "history", items: [commandItem("undo")] },
		];
		const resolved = resolveToolbarSections(sections, createContext());
		expect(resolved.map((section) => section.id)).toEqual(["history"]);
	});

	it("defaults a section with no align to the start edge", () => {
		const sections: ToolbarSection[] = [
			{ id: "history", items: [commandItem("undo")] },
		];
		expect(resolveToolbarSections(sections, createContext())[0].align).toBe(
			"start",
		);
	});

	/** The id keys the rendered section, so a twin would be invisible, not wrong. */
	it("throws when two sections share an id", () => {
		const sections: ToolbarSection[] = [
			{ id: "history", items: [commandItem("undo")] },
			{ id: "history", items: [commandItem("redo")] },
		];
		expect(() => resolveToolbarSections(sections, createContext())).toThrow(
			/"history"/,
		);
	});
});
