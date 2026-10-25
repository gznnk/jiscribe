import { describe, it, expect } from "vitest";

import {
	resolveLocaleMessages,
	resolveLocalizedLabel,
} from "../resolveLocaleMessages";

const dict = { en: "General", ja: "一般" };

describe("resolveLocaleMessages", () => {
	it("prefers an exact locale match", () => {
		expect(resolveLocaleMessages(dict, "ja")).toBe("一般");
		expect(resolveLocaleMessages(dict, "en")).toBe("General");
	});

	it("falls back to the language subtag of a regional locale", () => {
		expect(resolveLocaleMessages(dict, "ja-JP")).toBe("一般");
		expect(resolveLocaleMessages(dict, "en-US")).toBe("General");
	});

	it("prefers an exact regional entry over the language subtag", () => {
		const regional = { ...dict, "en-GB": "Generall" };
		expect(resolveLocaleMessages(regional, "en-GB")).toBe("Generall");
		expect(resolveLocaleMessages(regional, "en-AU")).toBe("General");
	});

	it("falls back to en for an unknown locale", () => {
		expect(resolveLocaleMessages(dict, "fr")).toBe("General");
		expect(resolveLocaleMessages(dict, "de-CH")).toBe("General");
		expect(resolveLocaleMessages(dict, "")).toBe("General");
	});

	it("resolves non-string dictionary values too", () => {
		const objects = { en: { ok: "OK" }, ja: { ok: "はい" } };
		expect(resolveLocaleMessages(objects, "ja-JP")).toEqual({ ok: "はい" });
	});
});

describe("resolveLocalizedLabel", () => {
	it("returns a plain string as-is for any locale", () => {
		expect(resolveLocalizedLabel("Rect", "ja")).toBe("Rect");
		expect(resolveLocalizedLabel("Rect", "en")).toBe("Rect");
	});

	it("resolves a dictionary label for the locale", () => {
		expect(resolveLocalizedLabel(dict, "ja-JP")).toBe("一般");
		expect(resolveLocalizedLabel(dict, "fr")).toBe("General");
	});
});
