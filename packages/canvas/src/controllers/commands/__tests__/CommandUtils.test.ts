import { afterEach, describe, expect, it, vi } from "vitest";

import {
	defaultCanvasMessages,
	resolveCanvasMessages,
} from "../../messages/CanvasMessages";
import { formatShortcutTokens, resolveCommandLabel } from "../CommandUtils";

/** Pin getPlatform()'s detection via navigator.userAgent */
const stubPlatform = (platform: "mac" | "win"): void => {
	const userAgent =
		platform === "mac"
			? "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
			: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
	vi.stubGlobal("navigator", { userAgent });
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("formatShortcutTokens", () => {
	it("returns modifier keys as words on Windows", () => {
		stubPlatform("win");
		expect(formatShortcutTokens({ code: "KeyZ", ctrl: true })).toEqual([
			"Ctrl",
			"Z",
		]);
	});

	it("includes shift and returns in order on Windows", () => {
		stubPlatform("win");
		expect(
			formatShortcutTokens({ code: "KeyZ", ctrl: true, shift: true }),
		).toEqual(["Ctrl", "Shift", "Z"]);
	});

	it("returns modifier keys as symbols on Mac", () => {
		stubPlatform("mac");
		expect(formatShortcutTokens({ code: "KeyZ", meta: true })).toEqual([
			"⌘",
			"Z",
		]);
	});

	it("places key-based symbol keys at the end as-is", () => {
		stubPlatform("win");
		expect(formatShortcutTokens({ key: "=", ctrl: true })).toEqual([
			"Ctrl",
			"=",
		]);
	});

	it("converts arrow keys to symbols", () => {
		stubPlatform("win");
		expect(formatShortcutTokens({ code: "ArrowUp" })).toEqual(["↑"]);
	});
});

describe("resolveCommandLabel", () => {
	const command = { id: "undo", label: { en: "Undo", ja: "元に戻す" } };

	it("no override -> the command's own label for the locale", () => {
		expect(resolveCommandLabel(command, defaultCanvasMessages, "ja")).toBe(
			"元に戻す",
		);
	});

	it("a locale the command does not ship -> its English", () => {
		expect(resolveCommandLabel(command, defaultCanvasMessages, "de")).toBe(
			"Undo",
		);
	});

	it("a plain label is locale-agnostic", () => {
		expect(
			resolveCommandLabel(
				{ id: "vendor.act", label: "Act" },
				defaultCanvasMessages,
				"ja",
			),
		).toBe("Act");
	});

	it("override present -> the override wins over every locale", () => {
		const merged = resolveCanvasMessages("ja", {
			commandLabels: { undo: "Custom undo" },
		});
		expect(resolveCommandLabel(command, merged, "ja")).toBe("Custom undo");
	});

	it("override for another id -> falls back to the command's own label", () => {
		const merged = resolveCanvasMessages("ja", {
			commandLabels: { redo: "Custom redo" },
		});
		expect(resolveCommandLabel(command, merged, "ja")).toBe("元に戻す");
	});
});
