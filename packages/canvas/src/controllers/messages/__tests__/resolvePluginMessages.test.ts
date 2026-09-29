import { describe, it, expect } from "vitest";

import type { CanvasPlugin } from "../../../plugin/CanvasPlugin";
import type { Command } from "../../commands/CommandTypes";
import {
	defaultCanvasMessages,
	getCommandLabel,
	resolveCanvasMessages,
} from "../CanvasMessages";
import { resolvePluginMessages } from "../resolvePluginMessages";

const stubCommand = (id: string, label: string): Command => ({
	id,
	label,
	canExecute: () => true,
});

const snapCommand = stubCommand("grid.snap", "Snap to Grid");

const gridPlugin: CanvasPlugin = {
	id: "grid",
	commands: [snapCommand],
	messages: {
		en: {
			commandLabels: { "grid.snap": "Snap to Grid" },
			strings: { menuGrid: "Grid" },
		},
		ja: {
			commandLabels: { "grid.snap": "グリッドに合わせる" },
			strings: { menuGrid: "グリッド" },
		},
	},
};

const haloPlugin: CanvasPlugin = {
	id: "halo",
	messages: {
		en: { strings: { menuGrid: "Halo" } },
		fr: { strings: { menuGrid: "Halo (fr)" } },
	},
};

describe("resolvePluginMessages", () => {
	it("no plugin contributes messages -> nothing to merge", () => {
		expect(resolvePluginMessages()).toBeUndefined();
		expect(resolvePluginMessages([{ id: "bare" }])).toBeUndefined();
	});

	it("namespaces a plugin's strings under its id and leaves command ids alone", () => {
		const byLocale = resolvePluginMessages([gridPlugin]);
		expect(byLocale?.ja).toEqual({
			commandLabels: { "grid.snap": "グリッドに合わせる" },
			pluginStrings: { "grid.menuGrid": "グリッド" },
		});
	});

	it("two plugins sharing a string key stay apart under their own ids", () => {
		const byLocale = resolvePluginMessages([gridPlugin, haloPlugin]);
		expect(byLocale?.en.pluginStrings).toEqual({
			"grid.menuGrid": "Grid",
			"halo.menuGrid": "Halo",
		});
	});

	it("carries the union of the locales, each plugin falling back on its own", () => {
		const byLocale = resolvePluginMessages([gridPlugin, haloPlugin]);
		// fr comes from halo alone; grid has no fr and lands on its own English.
		expect(byLocale?.fr.pluginStrings).toEqual({
			"grid.menuGrid": "Grid",
			"halo.menuGrid": "Halo (fr)",
		});
	});

	it("throws when two message-contributing plugins share an id", () => {
		expect(() =>
			resolvePluginMessages([gridPlugin, { ...gridPlugin, commands: [] }]),
		).toThrow(/two plugins contribute messages under the id "grid"/);
	});

	it("throws when a plugin labels a command it does not contribute", () => {
		const intruder: CanvasPlugin = {
			id: "intruder",
			messages: { en: { commandLabels: { undo: "Take it back" } } },
		};
		expect(() => resolvePluginMessages([intruder])).toThrow(
			/labels command "undo", which it does not contribute/,
		);
	});
});

describe("resolveCanvasMessages with plugin messages", () => {
	const pluginMessages = resolvePluginMessages([gridPlugin, haloPlugin]);

	it("a contributed command reads the host's locale", () => {
		const merged = resolveCanvasMessages("ja", undefined, pluginMessages);
		expect(getCommandLabel(merged, snapCommand)).toBe("グリッドに合わせる");
	});

	it("a locale no dictionary has falls back to the command's own label", () => {
		const merged = resolveCanvasMessages("de", undefined, pluginMessages);
		expect(getCommandLabel(merged, snapCommand)).toBe("Snap to Grid");
	});

	it("the host overrides a plugin's command label", () => {
		const merged = resolveCanvasMessages(
			"ja",
			{ commandLabels: { "grid.snap": "格子に吸着" } },
			pluginMessages,
		);
		expect(getCommandLabel(merged, snapCommand)).toBe("格子に吸着");
	});

	it("the host overrides a plugin's own string, and only that one", () => {
		const merged = resolveCanvasMessages(
			"en",
			{ pluginStrings: { "grid.menuGrid": "Guides" } },
			pluginMessages,
		);
		expect(merged.pluginStrings["grid.menuGrid"]).toBe("Guides");
		expect(merged.pluginStrings["halo.menuGrid"]).toBe("Halo");
	});

	it("a plugin leaves the built-in command labels standing", () => {
		const merged = resolveCanvasMessages("ja", undefined, pluginMessages);
		expect(merged.commandLabels.undo).toBe("元に戻す");
	});

	it("does not mutate the defaults", () => {
		resolveCanvasMessages("ja", undefined, pluginMessages);
		expect(defaultCanvasMessages.pluginStrings).toEqual({});
	});
});
