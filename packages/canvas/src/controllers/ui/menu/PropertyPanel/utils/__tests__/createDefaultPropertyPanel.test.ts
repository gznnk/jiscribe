import type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";
import { describe, expect, it } from "vitest";

import { createDefaultPropertyPanel } from "../createDefaultPropertyPanel";

const features = (extra: Partial<ObjectFeatures>): ObjectFeatures => ({
	type: "rect",
	geometry: "rect",
	...extra,
});

/** Section ids in display order, which is what the panel's layout is judged by. */
const sectionIds = (sections: { id: string }[]): string[] =>
	sections.map((section) => section.id);

/** Item kinds of one section, or undefined when the section was not derived. */
const itemsOf = (
	sections: { id: string; items: { type: string }[] }[],
	id: string,
): string[] | undefined =>
	sections.find((section) => section.id === id)?.items.map((item) => item.type);

describe("createDefaultPropertyPanel", () => {
	it("derives layout / fill / border / text for a rect-like type", () => {
		const sections = createDefaultPropertyPanel(
			features({
				transform: true,
				stroke: true,
				fill: true,
				text: "body",
				radius: true,
			}),
		);

		expect(sectionIds(sections)).toEqual(["layout", "fill", "stroke", "text"]);
		expect(itemsOf(sections, "layout")).toEqual([
			"position",
			"size",
			"rotation",
			"lockAspectRatio",
		]);
		expect(itemsOf(sections, "fill")).toEqual(["fill"]);
		expect(itemsOf(sections, "stroke")).toEqual([
			"strokeColor",
			"strokeWidth",
			"strokeDashType",
			"radius",
		]);
		expect(itemsOf(sections, "text")).toEqual([
			"fontFamily",
			"fontSize",
			"fontColor",
			"textFormat",
			"textAlign",
			"verticalAlign",
		]);
	});

	it("leaves the corner radius out of a filled type that has none", () => {
		const sections = createDefaultPropertyPanel(
			features({
				geometry: "ellipse",
				transform: true,
				stroke: true,
				fill: true,
			}),
		);

		expect(itemsOf(sections, "stroke")).toEqual([
			"strokeColor",
			"strokeWidth",
			"strokeDashType",
		]);
	});

	it("calls the stroke of a faceless type a line, and offers no fill", () => {
		const sections = createDefaultPropertyPanel(
			features({ geometry: "poly", stroke: true, arrow: true }),
		);

		expect(sectionIds(sections)).toEqual(["line", "arrow"]);
		expect(itemsOf(sections, "line")).toEqual([
			"strokeColor",
			"strokeWidth",
			"strokeDashType",
		]);
		expect(itemsOf(sections, "arrow")).toEqual(["arrowHeads"]);
	});

	it("gives a transform-only type the layout section alone", () => {
		const sections = createDefaultPropertyPanel(
			features({ geometry: "none", transform: true }),
		);

		expect(sectionIds(sections)).toEqual(["layout"]);
	});

	it("offers a point only position and rotation, since its box is its content", () => {
		const sections = createDefaultPropertyPanel(
			features({ geometry: "point", transform: true, text: "body" }),
		);

		expect(sectionIds(sections)).toEqual(["layout", "text"]);
		expect(itemsOf(sections, "layout")).toEqual(["position", "rotation"]);
	});

	it("offers no vertical alignment for a point, which has no slack to move through", () => {
		const sections = createDefaultPropertyPanel(
			features({ geometry: "point", transform: true, text: "body" }),
		);

		expect(itemsOf(sections, "text")).toEqual([
			"fontFamily",
			"fontSize",
			"fontColor",
			"textFormat",
			"textAlign",
		]);
	});

	it("derives nothing from a type that declares no feature at all", () => {
		expect(createDefaultPropertyPanel(features({}))).toEqual([]);
	});

	it("labels the core sections with their English wording", () => {
		const sections = createDefaultPropertyPanel(
			features({ transform: true, stroke: true, fill: true, text: "body" }),
		);

		expect(sections.map((section) => section.label)).toEqual([
			"Layout",
			"Fill",
			"Border",
			"Text",
		]);
	});
});
