import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
	resetTextMeasurementForTests,
} from "@jiscribe/canvas-sdk/doc";
import { calcLabelTextBoxSize } from "@jiscribe/doc";
import type { ObjectDoc } from "@jiscribe/doc";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { containerDocDefinition } from "../../doc";
import { calcContainerTitleRegion } from "../calcContainerTitleRegion";
import {
	CONTAINER_DOC_DEFAULTS,
	CONTAINER_HEADER_HEIGHT,
} from "../ContainerDoc";

// Measuring with nobody having offered throws, and a node test has no browser canvas.
beforeAll(() => {
	offerTextMeasurement(createEstimateTextMeasurement());
});

afterAll(() => {
	resetTextMeasurementForTests();
});

const BOX = { width: 400, height: 300 };

/** The title's width set on one line in the type's text defaults. */
const measureTitleWidth = (doc: Readonly<Record<string, unknown>>): number =>
	calcLabelTextBoxSize(doc, {
		fontSize: CONTAINER_DOC_DEFAULTS.fontSize,
		fontWeight: CONTAINER_DOC_DEFAULTS.fontWeight,
	}).width;

describe("calcContainerTitleRegion", () => {
	it("is as wide as the title set on one line, and as tall as the stated header band", () => {
		const doc = { ...BOX, text: "Orders", headerHeight: 56 };

		expect(calcContainerTitleRegion(doc)).toEqual({
			x: -200,
			y: -150,
			width: measureTitleWidth(doc),
			height: 56,
		});
		expect(measureTitleWidth(doc)).toBeGreaterThan(0);
	});

	it("is as tall as the default header band when the document states none", () => {
		expect(calcContainerTitleRegion({ ...BOX, text: "Orders" })?.height).toBe(
			CONTAINER_HEADER_HEIGHT,
		);
	});

	it.each(["left", "center", "right"] as const)(
		"sits at the band's %s end",
		(textAlign) => {
			const doc = { ...BOX, text: "Orders", textAlign };
			const width = measureTitleWidth(doc);
			const expectedX = {
				left: -200,
				center: -width / 2,
				right: 200 - width,
			}[textAlign];

			expect(calcContainerTitleRegion(doc)?.x).toBe(expectedX);
		},
	);

	it("sits at the left end, the type's default, when the document states no alignment", () => {
		expect(calcContainerTitleRegion({ ...BOX, text: "Orders" })?.x).toBe(-200);
	});

	it("grows with the title, but never beyond the box", () => {
		const short = calcContainerTitleRegion({ ...BOX, text: "Orders" });
		const long = calcContainerTitleRegion({
			...BOX,
			text: "Orders and invoices",
		});
		const tooLong = calcContainerTitleRegion({
			...BOX,
			text: "A title far longer than the four hundred pixels the box is wide",
			textAlign: "right",
		});

		expect(long?.width).toBeGreaterThan(short?.width as number);
		expect(tooLong).toMatchObject({ x: -200, width: 400 });
	});

	it("measures the title in the document's own font size", () => {
		const base = calcContainerTitleRegion({ ...BOX, text: "Orders" });
		const larger = calcContainerTitleRegion({
			...BOX,
			text: "Orders",
			fontSize: 28,
		});

		expect(larger?.width).toBeGreaterThan(base?.width as number);
	});

	it.each([
		["an empty title", { text: "" }],
		["no title", {}],
		["runs with no characters", { text: [{ text: "" }] }],
	])("is 0 wide for %s, centred on the band when the title is", (_, title) => {
		const region = calcContainerTitleRegion({
			...BOX,
			...title,
			textAlign: "center",
		});

		expect(region?.width).toBe(0);
		expect(region?.x).toBeCloseTo(0);
	});

	it.each([
		["width missing", { height: 300 }],
		["height missing", { width: 400 }],
		["width not finite", { width: Number.NaN, height: 300 }],
		["height not finite", { width: 400, height: Number.POSITIVE_INFINITY }],
	])("answers nothing with %s", (_, box) => {
		expect(
			calcContainerTitleRegion({ ...box, text: "Orders" }),
		).toBeUndefined();
	});
});

describe("containerDocDefinition.layoutContainerTitleRegion", () => {
	it("is calcContainerTitleRegion", () => {
		const doc = {
			id: "container-1",
			type: "container",
			...BOX,
			text: "Orders",
		} as ObjectDoc;

		expect(containerDocDefinition.layoutContainerTitleRegion?.(doc)).toEqual(
			calcContainerTitleRegion(doc),
		);
	});
});
