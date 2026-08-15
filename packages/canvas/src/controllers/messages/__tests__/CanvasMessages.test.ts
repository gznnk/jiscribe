import { describe, it, expect } from "vitest";

import {
	defaultCanvasMessages,
	getCommandLabel,
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
		const merged = resolveCanvasMessages("ja");
		expect(merged.toolbarZoomIn).toBe(jaCanvasMessages.toolbarZoomIn);
		expect(merged.commandLabels.undo).toBe(jaCanvasMessages.commandLabels.undo);
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
			commandLabels: { undo: "Custom undo", newId: "New" },
		});
		// overridden id wins
		expect(merged.commandLabels.undo).toBe("Custom undo");
		// added id is present
		expect(merged.commandLabels.newId).toBe("New");
		// non-overridden id keeps the ja value
		expect(merged.commandLabels.redo).toBe(jaCanvasMessages.commandLabels.redo);
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

describe("getCommandLabel", () => {
	const command = { id: "undo", label: "Undo" };

	it("no override -> the command's English label", () => {
		expect(getCommandLabel(defaultCanvasMessages, command)).toBe("Undo");
	});

	it("override present -> the override wins", () => {
		const merged = resolveCanvasMessages("en", {
			commandLabels: { undo: "Custom undo" },
		});
		expect(getCommandLabel(merged, command)).toBe("Custom undo");
	});

	it("override for another id -> falls back to the command's label", () => {
		const merged = resolveCanvasMessages("en", {
			commandLabels: { redo: "Custom redo" },
		});
		expect(getCommandLabel(merged, command)).toBe("Undo");
	});
});
