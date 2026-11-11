import type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";
import { describe, it, expect } from "vitest";

import { coreStyleTable } from "../coreStyleTable";

/** A type declaring nothing but its identity, to switch one group on at a time. */
const featuresOf = (groups: Partial<ObjectFeatures> = {}): ObjectFeatures => ({
	type: "fixture",
	geometry: "rect",
	...groups,
});

const kindsOf = (groups: Partial<ObjectFeatures>): string[] =>
	Object.keys(coreStyleTable(featuresOf(groups))).sort();

describe("coreStyleTable", () => {
	it("a type declaring no group answers for nothing", () => {
		expect(kindsOf({})).toEqual([]);
	});

	it("the fill group brings the face and its opacity", () => {
		expect(kindsOf({ fill: true })).toEqual(["fill", "fillOpacity"]);
	});

	it("the stroke group brings all four of its fields", () => {
		expect(kindsOf({ stroke: true })).toEqual([
			"stroke",
			"strokeDashType",
			"strokeOpacity",
			"strokeWidth",
		]);
	});

	// The field is `rx`, the intent is named after what it means.
	it("the radius group brings the corner radius", () => {
		expect(kindsOf({ radius: true })).toEqual(["cornerRadius"]);
	});

	it("the arrow group brings both ends and their size", () => {
		expect(kindsOf({ arrow: true })).toEqual([
			"arrowScale",
			"endArrow",
			"startArrow",
		]);
	});

	it("the transform group brings the aspect-ratio lock", () => {
		expect(kindsOf({ transform: true })).toEqual(["lockAspectRatio"]);
	});

	// The body group alone does not bring it: a type whose region is its whole box
	// names one place with both bases, so it declares no basis to switch.
	it("the declared vertical basis brings its switch", () => {
		expect(kindsOf({ text: "body", textVerticalBasis: true })).toContain(
			"textVerticalBasis",
		);
		expect(kindsOf({ text: "body" })).not.toContain("textVerticalBasis");
	});

	it("a label text brings its caption's background, and no vertical placement", () => {
		const kinds = kindsOf({ text: "label" });
		expect(kinds).toContain("labelFill");
		expect(kinds).toContain("fontWeight");
		expect(kinds).not.toContain("verticalAlign");
		expect(kindsOf({ text: "body" })).not.toContain("labelFill");
	});

	it("an innerLabel text brings no caption background, and no vertical placement", () => {
		const kinds = kindsOf({ text: "innerLabel" });
		expect(kinds).not.toContain("labelFill");
		expect(kinds).toContain("fontWeight");
		expect(kinds).not.toContain("verticalAlign");
	});

	// Which text intents a body brings is textStyleTable's own business; what this
	// pins is that the shape groups and the text one land in the same table.
	it("a type declaring a shape group and a body answers for both", () => {
		const kinds = kindsOf({ radius: true, text: "body" });
		expect(kinds).toContain("cornerRadius");
		expect(kinds).toContain("fontColor");
		expect(kinds).not.toContain("fill");
	});
});
