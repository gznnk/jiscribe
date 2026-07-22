import { describe, it, expect } from "vitest";

import type { ObjectFeatures } from "../../../../../schemas/objects/types/ObjectFeatures";
import { createDefaultMenu } from "../createDefaultMenu";

const features = (extra: Partial<ObjectFeatures>): ObjectFeatures => ({
	type: "rect",
	geometry: "rect",
	...extra,
});

describe("createDefaultMenu", () => {
	it("rect-like (all flags + radius) -> style(radius:true) / text / transform", () => {
		const sections = createDefaultMenu(
			features({
				transform: true,
				stroke: true,
				fill: true,
				text: true,
				radius: true,
			}),
		);
		expect(sections).toEqual([
			{
				id: "style",
				items: [
					{ type: "backgroundColor" },
					{ type: "borderColor" },
					{ type: "borderStyle", radius: true },
				],
			},
			{
				id: "text",
				items: [{ type: "fontStyle" }, { type: "textAlignment" }],
			},
			{ id: "transform", items: [{ type: "aspectRatio" }] },
		]);
	});

	it("polyline-like (stroke + arrow, no fill) -> arrowHead / line", () => {
		const sections = createDefaultMenu(
			features({ geometry: "poly", stroke: true, arrow: true }),
		);
		expect(sections).toEqual([
			{ id: "arrowHead", items: [{ type: "arrowHead" }] },
			{
				id: "line",
				items: [{ type: "lineColor" }, { type: "lineStyle" }],
			},
		]);
	});

	it("group-like (transform only) -> transform", () => {
		const sections = createDefaultMenu(
			features({ geometry: "none", transform: true }),
		);
		expect(sections).toEqual([
			{ id: "transform", items: [{ type: "aspectRatio" }] },
		]);
	});

	it("no flags -> empty", () => {
		expect(createDefaultMenu(features({}))).toEqual([]);
	});
});
