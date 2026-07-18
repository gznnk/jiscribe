import { describe, it, expect } from "vitest";

import {
	defaultCanvasMessages,
	getCommandLabel,
	mergeCanvasMessages,
} from "../CanvasMessages";

describe("mergeCanvasMessages", () => {
	it("no overrides -> equals the English defaults", () => {
		expect(mergeCanvasMessages()).toEqual(defaultCanvasMessages);
	});

	it("flat key override -> only that key changes", () => {
		const merged = mergeCanvasMessages({
			shortcutHelpTitle: "キーボードショートカット",
		});
		expect(merged.shortcutHelpTitle).toBe("キーボードショートカット");
		expect(merged.toolbarZoomIn).toBe(defaultCanvasMessages.toolbarZoomIn);
	});

	it("record override -> kept as-is (missing ids fall back at lookup time)", () => {
		const merged = mergeCanvasMessages({ commandLabels: { undo: "元に戻す" } });
		expect(merged.commandLabels).toEqual({ undo: "元に戻す" });
	});

	it("does not mutate the defaults", () => {
		mergeCanvasMessages({ commandLabels: { undo: "元に戻す" } });
		expect(defaultCanvasMessages.commandLabels).toEqual({});
	});
});

describe("getCommandLabel", () => {
	const command = { id: "undo", label: "Undo" };

	it("no override -> the command's English label", () => {
		expect(getCommandLabel(defaultCanvasMessages, command)).toBe("Undo");
	});

	it("override present -> the override wins", () => {
		const merged = mergeCanvasMessages({ commandLabels: { undo: "元に戻す" } });
		expect(getCommandLabel(merged, command)).toBe("元に戻す");
	});

	it("override for another id -> falls back to the command's label", () => {
		const merged = mergeCanvasMessages({ commandLabels: { redo: "やり直す" } });
		expect(getCommandLabel(merged, command)).toBe("Undo");
	});
});
