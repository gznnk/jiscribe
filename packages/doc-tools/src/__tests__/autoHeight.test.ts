import type { CanvasDoc } from "@jiscribe/doc";
import { supportsAutoHeight } from "@jiscribe/doc";
import {
	AUTO_HEIGHT_COMFORT_PADDING_EM,
	calcAutoShapeHeight,
	DEFAULT_FONT_FAMILY,
	offerTextMeasurement,
	TEXT_STYLE_FALLBACK,
	type TextMeasureFont,
} from "@jiscribe/doc/unstable";
import { standardObjectDocDefinitions } from "@jiscribe/standard-shapes/doc";
import { describe, expect, it } from "vitest";

import { diagnoseDoc } from "../diagnoseDoc";
import { nodeTextMeasurement } from "../measure/nodeTextMeasurer";
import { validateDoc } from "../validateDoc";

/** A shipped shape with no `height`, as a one-object document's text. */
const docText = (object: Record<string, unknown>): string =>
	JSON.stringify({ version: 1, root: [object] });

/** The font a body with no styling of its own is drawn with. */
const bodyFont = (fontSize: number): TextMeasureFont => ({
	fontSize,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: TEXT_STYLE_FALLBACK.fontWeight,
	fontStyle: TEXT_STYLE_FALLBACK.fontStyle,
});

/** The height the shape would be drawn at, measured against the shipped fonts. */
const deriveHeight = (
	type: string,
	width: number,
	text: string,
	fontSize: number,
): number => {
	offerTextMeasurement(nodeTextMeasurement());
	const textRegion = standardObjectDocDefinitions.get(type)?.textRegion;
	const height = calcAutoShapeHeight(
		{ width, height: 0 },
		text,
		bodyFont(fontSize),
		textRegion!,
	);
	expect(height).not.toBeNull();
	return height!;
};

describe("a document that states no height", () => {
	it("is accepted for a type that lays its text out inside its box", () => {
		for (const type of ["rect", "stadium", "note", "sticky"]) {
			const result = validateDoc(
				docText({ id: "a", type, x: 0, y: 0, width: 200, text: "Label" }),
			);
			expect(result.diagnostics, type).toEqual([]);
			expect(result.ok, type).toBe(true);
		}
	});

	it("is refused for a type that draws its label outside its outline", () => {
		for (const type of ["actor", "cross", "extract"]) {
			const result = validateDoc(
				docText({ id: "a", type, x: 0, y: 0, width: 200, text: "Label" }),
			);
			expect(result.ok, type).toBe(false);
			expect(
				result.diagnostics.some((diagnostic) =>
					/height/.test(diagnostic.message),
				),
				type,
			).toBe(true);
		}
	});

	it("is refused for a type that denies what its own region implies", () => {
		// `container` is as tall as what it frames and `markdown` renders its body,
		// so neither takes its height from the text laid out in its region
		// (ObjectDocDefinition.autoHeight).
		for (const type of ["container", "markdown"]) {
			const result = validateDoc(
				docText({ id: "a", type, x: 0, y: 0, width: 200, text: "Label" }),
			);
			expect(result.ok, type).toBe(false);
			expect(
				result.diagnostics.some((diagnostic) =>
					/height/.test(diagnostic.message),
				),
				type,
			).toBe(true);
		}
	});

	it("is refused for a type whose bands are sized from their own text", () => {
		const result = validateDoc(
			docText({
				id: "a",
				type: "record",
				x: 0,
				y: 0,
				width: 200,
				slots: [{ id: "name", text: "Order" }],
			}),
		);
		expect(result.ok).toBe(false);
	});

	it("is passed over by the overflow check, having no height to overflow", () => {
		const doc = validateDoc(
			docText({
				id: "a",
				type: "rect",
				x: 0,
				y: 0,
				width: 60,
				text: "text far too long to fit into sixty pixels of box",
				fontSize: 16,
			}),
		).doc as CanvasDoc;
		expect(diagnoseDoc(doc)).toEqual([]);
	});
});

describe("the height a shape with none is drawn at", () => {
	it("clears the overflow check by the comfort band it leaves", () => {
		// The 264x88 two-line label of scratch/2026-08-20-llm-training/overview.jis.json.
		const width = 264;
		const text = "大量のテキストを\n読み込ませる";
		const fontSize = 16;
		const height = deriveHeight("rect", width, text, fontSize);

		const rectAt = (boxHeight: number): CanvasDoc => {
			const parsed = validateDoc(
				docText({
					id: "a",
					type: "rect",
					x: 0,
					y: 0,
					width,
					height: boxHeight,
					text,
					fontSize,
				}),
			);
			expect(parsed.ok).toBe(true);
			return parsed.doc as CanvasDoc;
		};

		expect(diagnoseDoc(rectAt(height))).toEqual([]);
		// The derived height is no longer the smallest the check passes: the comfort
		// band sits between the two, and the check itself allows half the leading on
		// top of that before it calls the text clipped.
		const comfortBand = fontSize * AUTO_HEIGHT_COMFORT_PADDING_EM * 2;
		const tolerance = (fontSize * 1.5 - fontSize) / 2;
		expect(diagnoseDoc(rectAt(height - comfortBand))).toEqual([]);
		expect(
			diagnoseDoc(rectAt(height - comfortBand - tolerance - 1)),
		).toHaveLength(1);
		// Two lines of 16px at the shared line height, the box's own padding, and
		// 0.75em of room above and below.
		expect(height).toBe(Math.ceil(fontSize * 1.5 * 2 + 2 * 2 + comfortBand));
		expect(height).toBe(76);
	});

	it("is answered for every shipped type that may leave the field out", () => {
		for (const [type, definition] of standardObjectDocDefinitions) {
			if (!supportsAutoHeight(definition)) {
				continue;
			}
			expect(deriveHeight(type, 240, "Label", 16), type).toBeGreaterThan(0);
		}
	});
});
