import { afterEach, describe, expect, it, vi } from "vitest";

import type { calcVisualLineCount } from "../../layout/calcVisualLineCount";
import type { measureTextWidth } from "../../layout/measureTextWidth";
import type { TextMeasureFont } from "../TextMeasureFont";

const font: TextMeasureFont = {
	fontSize: 10,
	fontFamily: "Noto Sans JP",
	fontWeight: "normal",
};

/**
 * Loads a fresh copy of the measurement modules against a fake canvas, so these
 * measurements take the browser path (`ctx.font` then `ctx.measureText`) instead
 * of the character-count fallback the other tests run on. The fake reports one
 * type size of width per character and records every assignment to `font`, which
 * is what the assertions read. A fresh copy is needed because this module keeps
 * its canvas — and the font last assigned to it — for the process's lifetime.
 */
const loadAgainstFakeCanvas = async (): Promise<{
	assignedFonts: string[];
	calcVisualLineCount: typeof calcVisualLineCount;
	measureTextWidth: typeof measureTextWidth;
}> => {
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
	vi.resetModules();
	return {
		assignedFonts,
		calcVisualLineCount: (await import("../../layout/calcVisualLineCount"))
			.calcVisualLineCount,
		measureTextWidth: (await import("../../layout/measureTextWidth"))
			.measureTextWidth,
	};
};

describe("the shared measurement context", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.resetModules();
	});

	it("parses the shorthand once for a word measured character by character", async () => {
		const { assignedFonts, calcVisualLineCount } =
			await loadAgainstFakeCanvas();
		// Ten characters of 10px in a 30px box: no space to break at, so wrapping
		// falls back to break-word, which measures every character on its own.
		expect(calcVisualLineCount("aaaaaaaaaa", font, 30)).toBe(4);
		expect(assignedFonts).toEqual(["normal normal 10px Noto Sans JP"]);
	});

	it("switches fonts back and forth when two runs are measured in turn", async () => {
		const { assignedFonts, measureTextWidth } = await loadAgainstFakeCanvas();
		const styled = [{ text: "aa" }, { text: "bb", fontSize: 20 }];
		// Each run is measured under its own size (2 × 10 + 2 × 20), which only
		// holds if the second run replaced the font the first one left set — and
		// again on the second pass, which starts on the wrong font.
		expect(measureTextWidth(styled, font)).toBe(60);
		expect(measureTextWidth(styled, font)).toBe(60);
		expect(assignedFonts).toEqual([
			"normal normal 10px Noto Sans JP",
			"normal normal 20px Noto Sans JP",
			"normal normal 10px Noto Sans JP",
			"normal normal 20px Noto Sans JP",
		]);
	});
});
