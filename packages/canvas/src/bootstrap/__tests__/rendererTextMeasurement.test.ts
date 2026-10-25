import type { TextMeasureFont } from "@jiscribe/doc/text/measure/TextMeasureFont";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createRendererTextMeasurement } from "../rendererTextMeasurement";

const font: TextMeasureFont = {
	fontSize: 10,
	fontFamily: "Noto Sans JP",
	fontWeight: "normal",
};

/**
 * Builds the measurement against a fake `document`, so these tests take the
 * browser path (`ctx.font` then `ctx.measureText`) in the node environment the
 * suite runs in. The fake reports one type size of width per character and
 * records every assignment to `font`, which is what the assertions read.
 */
const createAgainstFakeCanvas = (): {
	assignedFonts: string[];
	measurerFor: (measured: TextMeasureFont) => (text: string) => number;
} => {
	const assignedFonts: string[] = [];
	let currentFont = "";
	const ctx = {
		get font(): string {
			return currentFont;
		},
		set font(shorthand: string) {
			currentFont = shorthand;
			assignedFonts.push(shorthand);
		},
		measureText: (text: string) => ({
			width: text.length * Number(/(\d+)px/.exec(currentFont)?.[1] ?? 0),
		}),
	};
	vi.stubGlobal("document", {
		createElement: () => ({ getContext: () => ctx }),
	});
	const measurement = createRendererTextMeasurement();
	expect(measurement).not.toBeNull();
	return {
		assignedFonts,
		measurerFor: (measured) => measurement!.createMeasurer(measured),
	};
};

describe("the renderer's shared measurement context", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("parses the shorthand once for a word measured character by character", () => {
		const { assignedFonts, measurerFor } = createAgainstFakeCanvas();
		const measure = measurerFor(font);

		for (const char of "aaaaaaaaaa") {
			expect(measure(char)).toBe(10);
		}

		expect(assignedFonts).toEqual(["normal normal 10px Noto Sans JP"]);
	});

	it("switches fonts back and forth when two runs are measured in turn", () => {
		const { assignedFonts, measurerFor } = createAgainstFakeCanvas();
		// One measurer per run, as a layout pass builds them, measured in the order
		// the runs are laid out — twice over, the second pass starting on the font
		// the first one left set.
		const measureSmall = measurerFor(font);
		const measureLarge = measurerFor({ ...font, fontSize: 20 });

		expect(measureSmall("aa") + measureLarge("bb")).toBe(60);
		expect(measureSmall("aa") + measureLarge("bb")).toBe(60);

		expect(assignedFonts).toEqual([
			"normal normal 10px Noto Sans JP",
			"normal normal 20px Noto Sans JP",
			"normal normal 10px Noto Sans JP",
			"normal normal 20px Noto Sans JP",
		]);
	});

	it("abstains where the host has no document at all", () => {
		vi.stubGlobal("document", undefined);

		expect(createRendererTextMeasurement()).toBeNull();
	});

	it("abstains where the canvas has no 2d context, as in jsdom", () => {
		vi.stubGlobal("document", {
			createElement: () => ({ getContext: () => null }),
		});

		expect(createRendererTextMeasurement()).toBeNull();
	});
});
