import { afterEach, describe, expect, it, vi } from "vitest";

import { formatShortcutTokens } from "../CommandUtils";

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
