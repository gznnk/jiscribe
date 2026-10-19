import { describe, it, expect } from "vitest";

import {
	defaultCanvasMessages,
	resolveCanvasMessages,
} from "../CanvasMessages";
import { jaCanvasMessages } from "../jaCanvasMessages";
import {
	resolveLocaleMessages,
	resolveLocalizedLabel,
} from "../resolveLocaleMessages";

describe("resolveCanvasMessages", () => {
	it("en, no overrides -> equals the English defaults", () => {
		expect(resolveCanvasMessages("en")).toEqual(defaultCanvasMessages);
	});

	it("exact locale match -> the built-in dictionary for that locale", () => {
		expect(resolveCanvasMessages("ja").toolbarZoomIn).toBe(
			jaCanvasMessages.toolbarZoomIn,
		);
	});

	it("language subtag fallback -> ja-JP resolves to the ja dictionary", () => {
		expect(resolveCanvasMessages("ja-JP").toolbarZoomIn).toBe(
			jaCanvasMessages.toolbarZoomIn,
		);
	});

	it("unknown locale -> falls back to the English defaults", () => {
		expect(resolveCanvasMessages("fr").toolbarZoomIn).toBe(
			defaultCanvasMessages.toolbarZoomIn,
		);
	});

	it("flat override wins over the locale dictionary", () => {
		const merged = resolveCanvasMessages("ja", {
			toolbarZoomIn: "Custom",
		});
		expect(merged.toolbarZoomIn).toBe("Custom");
		// non-overridden flat keys keep the locale value
		expect(merged.toolbarZoomOut).toBe(jaCanvasMessages.toolbarZoomOut);
	});

	it("record override merges per key over the locale record", () => {
		const merged = resolveCanvasMessages("ja", {
			colorNames: { Red: "朱", Chartreuse: "黄緑" },
		});
		// overridden key wins
		expect(merged.colorNames.Red).toBe("朱");
		// added key is present
		expect(merged.colorNames.Chartreuse).toBe("黄緑");
		// non-overridden key keeps the ja value
		expect(merged.colorNames.Blue).toBe(jaCanvasMessages.colorNames.Blue);
	});

	it("does not mutate the defaults", () => {
		resolveCanvasMessages("en", { commandLabels: { undo: "Custom undo" } });
		expect(defaultCanvasMessages.commandLabels).toEqual({});
	});
});

describe("resolveLocaleMessages", () => {
	const dict = { en: "english", ja: "japanese" };

	it("exact match", () => {
		expect(resolveLocaleMessages(dict, "ja")).toBe("japanese");
	});

	it("language subtag (ja-JP -> ja)", () => {
		expect(resolveLocaleMessages(dict, "ja-JP")).toBe("japanese");
	});

	it("unknown locale falls back to en", () => {
		expect(resolveLocaleMessages(dict, "de")).toBe("english");
	});
});

describe("resolveLocalizedLabel", () => {
	it("plain string is locale-agnostic", () => {
		expect(resolveLocalizedLabel("Frame", "ja")).toBe("Frame");
	});

	it("dictionary resolves for the locale", () => {
		expect(resolveLocalizedLabel({ en: "Frame", ja: "枠" }, "ja")).toBe("枠");
	});

	it("dictionary falls back via language subtag (ja-JP -> ja)", () => {
		expect(resolveLocalizedLabel({ en: "Frame", ja: "枠" }, "ja-JP")).toBe(
			"枠",
		);
	});

	it("dictionary falls back to en for an unknown locale", () => {
		expect(resolveLocalizedLabel({ en: "Frame", ja: "枠" }, "de")).toBe(
			"Frame",
		);
	});
});
