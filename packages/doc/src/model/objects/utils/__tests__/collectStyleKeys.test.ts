import { describe, expect, it } from "vitest";

import { FILL_STYLE_KEYS } from "../../base/FillStyleDoc";
import { RADIUS_STYLE_KEYS } from "../../base/RadiusStyleDoc";
import { STROKE_STYLE_KEYS } from "../../base/StrokeStyleDoc";
import { LABEL_TEXT_KEYS } from "../../base/TextStyleDoc";
import type { ObjectFeatures } from "../../types/ObjectFeatures";
import { collectStyleKeys } from "../collectStyleKeys";

const features = (extra: Partial<ObjectFeatures> = {}): ObjectFeatures => ({
	type: "rect",
	geometry: "rect",
	...extra,
});

describe("collectStyleKeys", () => {
	it("collects nothing when no style group is enabled", () => {
		expect(collectStyleKeys(features())).toEqual([]);
	});

	it("collects the keys of each enabled group in stroke → fill → radius order", () => {
		expect(
			collectStyleKeys(
				features({ stroke: true, fill: true, text: "body", radius: true }),
			),
		).toEqual([...STROKE_STYLE_KEYS, ...FILL_STYLE_KEYS, ...RADIUS_STYLE_KEYS]);
	});

	it("excludes the text group's styling, which the mappers rebuild per slot", () => {
		for (const textType of [
			"body",
			"source",
			"label",
			"innerLabel",
			"slots",
		] as const) {
			const keys = collectStyleKeys(features({ text: textType }));
			expect(keys).not.toContain("text");
			expect(keys).not.toContain("textAlign");
		}
	});

	it("collects a caption's own fields, which sit on the object in doc and state alike", () => {
		expect(collectStyleKeys(features({ text: "label" }))).toEqual([
			...LABEL_TEXT_KEYS,
		]);
		expect(collectStyleKeys(features({ text: "body" }))).not.toContain(
			"labelFill",
		);
		expect(collectStyleKeys(features({ text: "innerLabel" }))).toEqual([]);
	});

	it("omits the groups that are off", () => {
		const keys = collectStyleKeys(features({ stroke: true, radius: true }));
		expect(keys).toEqual([...STROKE_STYLE_KEYS, ...RADIUS_STYLE_KEYS]);
		expect(keys).not.toContain("fill");
	});

	it("excludes geometry and transform, which the mappers rebuild", () => {
		const keys = collectStyleKeys(
			features({ transform: true, stroke: true, fill: true, text: "body" }),
		);
		for (const key of ["x", "y", "cx", "cy", "width", "height", "rotation"]) {
			expect(keys).not.toContain(key);
		}
	});
});
