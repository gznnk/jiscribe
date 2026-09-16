// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import type { CaretSurfaceRect } from "../measureCaretInSurface";
import { scrollSurfaceToCaret } from "../scrollSurfaceToCaret";

/** Vertical padding of the surface; any value works, the function only carries it through. */
const PADDING = { paddingTop: 4, paddingBottom: 4 };

/** Height of the surface's clip, the fixed-size region the text overflows. */
const CLIENT_HEIGHT = 120;

/** Height of one line box, so a caret can be placed a whole number of lines down. */
const LINE_HEIGHT = 24;

/**
 * A surface with a clip but no layout: jsdom computes no boxes, so clientHeight is
 * defined here and scrollTop is a plain writable property that takes any value.
 */
const createSurface = (scrollTop: number): HTMLElement => {
	const surface = document.createElement("div");
	Object.defineProperty(surface, "clientHeight", { value: CLIENT_HEIGHT });
	surface.scrollTop = scrollTop;
	return surface;
};

/** The line box whose top sits `top` px down the padding box. */
const caretAt = (top: number): CaretSurfaceRect => ({
	x: 0,
	top,
	bottom: top + LINE_HEIGHT,
	...PADDING,
});

/** Top of the line box `lineIndex` lines below the start of the text. */
const caretTopOfLine = (lineIndex: number): number =>
	PADDING.paddingTop + lineIndex * LINE_HEIGHT;

describe("scrollSurfaceToCaret", () => {
	it("scrolls down until a caret below the clip sits at its bottom edge", () => {
		const surface = createSurface(0);
		const caretTop = caretTopOfLine(9);

		scrollSurfaceToCaret(surface, caretAt(caretTop));

		expect(surface.scrollTop).toBe(
			caretTop + LINE_HEIGHT + PADDING.paddingBottom - CLIENT_HEIGHT,
		);
	});

	it("scrolls up until a caret above the clip sits at its top edge", () => {
		const surface = createSurface(240);
		const caretTop = caretTopOfLine(3);

		scrollSurfaceToCaret(surface, caretAt(caretTop));

		expect(surface.scrollTop).toBe(caretTop - PADDING.paddingTop);
	});

	it("leaves the scroll offset alone for a caret already inside the clip", () => {
		const surface = createSurface(240);
		// One line below the top of the clip, so the whole line box is visible.
		scrollSurfaceToCaret(surface, caretAt(240 + LINE_HEIGHT));

		expect(surface.scrollTop).toBe(240);
	});

	it("lands on the bottom of the scroll range for a caret on the last line", () => {
		const surface = createSurface(0);
		const lineCount = 30;
		// What the element's scrollHeight would be with that many lines laid out.
		const scrollHeight =
			PADDING.paddingTop + lineCount * LINE_HEIGHT + PADDING.paddingBottom;

		scrollSurfaceToCaret(surface, caretAt(caretTopOfLine(lineCount - 1)));

		expect(surface.scrollTop).toBe(scrollHeight - CLIENT_HEIGHT);
	});

	it("lands on 0 for a caret on the first line of a scrolled surface", () => {
		const surface = createSurface(240);

		scrollSurfaceToCaret(surface, caretAt(caretTopOfLine(0)));

		expect(surface.scrollTop).toBe(0);
	});
});
