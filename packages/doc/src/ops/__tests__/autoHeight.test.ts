import { afterEach, describe, expect, it } from "vitest";

import { docOps, emptyDoc, readObject } from "./support/docFixtures";
import type { CanvasDoc } from "../../model/canvas/CanvasDoc";
import type { ObjectDoc } from "../../model/objects/base/ObjectDoc";
import { AUTO_HEIGHT_COMFORT_PADDING_EM } from "../../text/block/autoHeightComfortPadding";
import {
	TEXT_BOX_PADDING_X,
	TEXT_BOX_PADDING_Y,
} from "../../text/block/textBoxPadding";
import { calcVisualTextHeight } from "../../text/layout/calcVisualTextHeight";
import type { TextMeasureFont } from "../../text/measure/TextMeasureFont";
import { setTextWidthMeasurerFactory } from "../../text/measure/textWidthMeasurer";
import { DEFAULT_FONT_FAMILY } from "../../text/style/fontFamilies";
import { TEXT_STYLE_FALLBACK } from "../../text/style/textStyleFallback";

/**
 * A doc holding one rect that states no height, so its height is the one its text
 * needs. The text is long enough to wrap several times at this width under every
 * measurement backend, the fallback estimate included.
 */
const autoHeightDoc = (
	overrides: Record<string, unknown> = {},
): { doc: CanvasDoc; id: string } => {
	const doc = emptyDoc();
	doc.root.push({
		id: "auto",
		type: "rect",
		x: 40,
		y: 20,
		width: 200,
		text: "a label long enough to take several lines at this width",
		fontSize: 16,
		...overrides,
	} as unknown as ObjectDoc);
	return { doc, id: "auto" };
};

describe("bounds of a shape that states no height", () => {
	it("measures the height its text needs instead of reading 0", () => {
		const { doc, id } = autoHeightDoc();

		const bounds = docOps.getObjectBounds(doc, id);

		expect(bounds).not.toBeNull();
		expect(bounds).toMatchObject({ x: 40, y: 20, width: 200 });
		expect(bounds!.height).toBeGreaterThan(0);
	});

	it("measures a wider box shorter, the text taking fewer lines", () => {
		const narrow = autoHeightDoc({ width: 120 });
		const wide = autoHeightDoc({ width: 400 });

		expect(docOps.getObjectBounds(wide.doc, wide.id)!.height).toBeLessThan(
			docOps.getObjectBounds(narrow.doc, narrow.id)!.height,
		);
	});

	it("measures a larger font taller at the same width", () => {
		const small = autoHeightDoc({ fontSize: 12 });
		const large = autoHeightDoc({ fontSize: 32 });

		expect(docOps.getObjectBounds(large.doc, large.id)!.height).toBeGreaterThan(
			docOps.getObjectBounds(small.doc, small.id)!.height,
		);
	});

	it("carries the derived height into the combined box and the listing", () => {
		const { doc, id } = autoHeightDoc();
		const height = docOps.getObjectBounds(doc, id)!.height;

		expect(docOps.getCombinedBounds(doc)).toEqual({
			x: 40,
			y: 20,
			width: 200,
			height,
		});
		expect(docOps.listObjects(doc)[0].bounds).toEqual({
			x: 40,
			y: 20,
			width: 200,
			height,
		});
	});

	it("aligns against the derived box, not against a flat one", () => {
		const { doc, id } = autoHeightDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0, width: 60, height: 40 });
		const height = docOps.getObjectBounds(doc, id)!.height;

		docOps.alignObjects(doc, [id, "rect-1"], "bottom");

		expect(readObject(doc, "rect-1").y).toBe(20 + height - 40);
	});
});

describe("resizing a shape that states no height", () => {
	it("keeps stating none when only the width changes", () => {
		const { doc, id } = autoHeightDoc();
		const tallAt200 = docOps.getObjectBounds(doc, id)!.height;

		docOps.resizeObject(doc, id, { width: 400 });

		expect(readObject(doc, id).height).toBeUndefined();
		expect(docOps.getObjectBounds(doc, id)!.height).toBeLessThan(tallAt200);
	});

	it("writes the height it was drawn at once the height is scaled", () => {
		const { doc, id } = autoHeightDoc();
		const derived = docOps.getObjectBounds(doc, id)!.height;

		docOps.resizeObject(doc, id, { height: derived * 2 });

		expect(readObject(doc, id).height).toBeCloseTo(derived * 2);
	});

	it("keeps stating none while it is only moved", () => {
		const { doc, id } = autoHeightDoc();

		docOps.setPosition(doc, id, { x: 300, y: 500 });

		expect(readObject(doc, id)).toMatchObject({ x: 300, y: 500 });
		expect(readObject(doc, id).height).toBeUndefined();
	});
});

/**
 * Counts the layout passes the block under test runs: one measurer is built per
 * styled run per pass, and every object here carries a plain-string text of one
 * run, so a pass is a derivation. The widths match the estimate the ops would
 * otherwise fall back to, so registering this changes no height.
 *
 * @param widthRatio - Width one character is charged, as a fraction of the type size; 0.6 is the estimate's own
 */
const countDerivations = (widthRatio = 0.6): { read: () => number } => {
	let passes = 0;
	setTextWidthMeasurerFactory((font: TextMeasureFont) => {
		passes += 1;
		return (text) => text.length * font.fontSize * widthRatio;
	});
	return { read: () => passes };
};

describe("re-deriving the height of a shape that states none", () => {
	afterEach(() => {
		setTextWidthMeasurerFactory(null);
	});

	it("derives once for repeated reads of an object nothing has touched", () => {
		const { doc, id } = autoHeightDoc();
		const derivations = countDerivations();

		const first = docOps.getObjectBounds(doc, id)!.height;
		const second = docOps.getObjectBounds(doc, id)!.height;

		expect(second).toBe(first);
		expect(derivations.read()).toBe(1);
	});

	it("keeps the derived height across a move, which cannot change it", () => {
		const { doc, id } = autoHeightDoc();
		const derivations = countDerivations();
		const before = docOps.getObjectBounds(doc, id)!.height;

		docOps.setPosition(doc, id, { x: 900, y: 700 });

		expect(docOps.getObjectBounds(doc, id)).toEqual({
			x: 900,
			y: 700,
			width: 200,
			height: before,
		});
		expect(derivations.read()).toBe(1);
	});

	it("derives again once the text changes", () => {
		const { doc, id } = autoHeightDoc();
		const derivations = countDerivations();
		const before = docOps.getObjectBounds(doc, id)!.height;

		docOps.setText(doc, id, `${"another line of text ".repeat(20)}`);

		expect(docOps.getObjectBounds(doc, id)!.height).toBeGreaterThan(before);
		expect(derivations.read()).toBe(2);
	});

	it("derives again once the width changes", () => {
		const { doc, id } = autoHeightDoc();
		const derivations = countDerivations();
		const before = docOps.getObjectBounds(doc, id)!.height;

		docOps.resizeObject(doc, id, { width: 600 });

		expect(docOps.getObjectBounds(doc, id)!.height).toBeLessThan(before);
		expect(derivations.read()).toBeGreaterThan(1);
	});

	it("derives again once the styling changes", () => {
		const { doc, id } = autoHeightDoc();
		const before = docOps.getObjectBounds(doc, id)!.height;

		docOps.setStyle(doc, [id], { fontSize: 32 });

		expect(docOps.getObjectBounds(doc, id)!.height).toBeGreaterThan(before);
	});

	it("derives again once a field only the type's region reads changes", () => {
		// An unknown field is kept on the object (extraProps), and a type's region
		// may be a function of one, so it has to count as an input like any other.
		const { doc, id } = autoHeightDoc();
		const derivations = countDerivations();

		docOps.getObjectBounds(doc, id);
		readObject(doc, id).headerHeight = 48;
		docOps.getObjectBounds(doc, id);

		expect(derivations.read()).toBe(2);
	});

	it("derives again once the measurement backend is swapped", () => {
		const { doc, id } = autoHeightDoc();
		countDerivations(0.6);
		const narrow = docOps.getObjectBounds(doc, id)!.height;

		countDerivations(1.4);

		expect(docOps.getObjectBounds(doc, id)!.height).toBeGreaterThan(narrow);
	});
});

describe("setHeightMode against the derived height", () => {
	it("writes the height the shape was drawn at when switching to fixed", () => {
		const { doc, id } = autoHeightDoc();
		const derived = docOps.getObjectBounds(doc, id)!.height;

		docOps.setHeightMode(doc, [id], { mode: "fixed", height: derived });

		expect(readObject(doc, id).height).toBe(derived);
		expect(docOps.getObjectBounds(doc, id)!.height).toBe(derived);
	});

	it("writes the comfort band in with it, the box keeping the room it had", () => {
		const { doc, id } = autoHeightDoc();
		const fontSize = 16;
		const derived = docOps.getObjectBounds(doc, id)!.height;

		docOps.setHeightMode(doc, [id], { mode: "fixed", height: derived });

		// Whatever the fixed height is, what it holds over the drawn lines is the
		// box's own padding and the room the derivation leaves around them: an
		// object switched to a stated height is drawn exactly as it was.
		const textHeight = calcVisualTextHeight(
			"a label long enough to take several lines at this width",
			{
				fontSize,
				fontFamily: DEFAULT_FONT_FAMILY,
				fontWeight: TEXT_STYLE_FALLBACK.fontWeight,
			},
			200 - TEXT_BOX_PADDING_X * 2,
		);
		expect(readObject(doc, id).height).toBe(
			textHeight +
				TEXT_BOX_PADDING_Y * 2 +
				fontSize * AUTO_HEIGHT_COMFORT_PADDING_EM * 2,
		);
	});

	it("drops the height again on the way back to auto", () => {
		const { doc, id } = autoHeightDoc({ height: 120 });

		expect(docOps.getObjectBounds(doc, id)!.height).toBe(120);
		docOps.setHeightMode(doc, [id], { mode: "auto" });

		expect(readObject(doc, id).height).toBeUndefined();
		expect(docOps.getObjectBounds(doc, id)!.height).not.toBe(120);
	});
});
