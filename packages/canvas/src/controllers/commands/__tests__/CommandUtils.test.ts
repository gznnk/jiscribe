import { afterEach, describe, expect, it, vi } from "vitest";

import { formatShortcutTokens } from "../CommandUtils";

/** getPlatform() の判定を navigator.userAgent 経由で固定する */
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
	it("Windows では修飾キーを単語で返す", () => {
		stubPlatform("win");
		expect(formatShortcutTokens({ code: "KeyZ", ctrl: true })).toEqual([
			"Ctrl",
			"Z",
		]);
	});

	it("Windows では shift を含めて順序通りに返す", () => {
		stubPlatform("win");
		expect(
			formatShortcutTokens({ code: "KeyZ", ctrl: true, shift: true }),
		).toEqual(["Ctrl", "Shift", "Z"]);
	});

	it("Mac では修飾キーを記号で返す", () => {
		stubPlatform("mac");
		expect(formatShortcutTokens({ code: "KeyZ", meta: true })).toEqual([
			"⌘",
			"Z",
		]);
	});

	it("key ベースの記号キーはそのまま末尾に置く", () => {
		stubPlatform("win");
		expect(formatShortcutTokens({ key: "=", ctrl: true })).toEqual([
			"Ctrl",
			"=",
		]);
	});

	it("矢印キーは記号に変換する", () => {
		stubPlatform("win");
		expect(formatShortcutTokens({ code: "ArrowUp" })).toEqual(["↑"]);
	});
});
