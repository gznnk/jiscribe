import type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";
import { describe, it, expect } from "vitest";

import { createDefaultMenu } from "../createDefaultMenu";

const features = (extra: Partial<ObjectFeatures>): ObjectFeatures => ({
	type: "rect",
	geometry: "rect",
	...extra,
});

describe("createDefaultMenu", () => {
	it("rect-like (all flags + radius) -> style(radius:true) / text", () => {
		const sections = createDefaultMenu(
			features({
				transform: true,
				stroke: true,
				fill: true,
				text: "body",
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
				items: [
					{ type: "font" },
					{ type: "textFormat" },
					{ type: "textAlignment" },
				],
			},
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

	it("group-like (transform only) -> no sections", () => {
		const sections = createDefaultMenu(
			features({ geometry: "none", transform: true }),
		);
		expect(sections).toEqual([]);
	});

	it("text-like (point geometry) -> text only, with the vertical row dropped", () => {
		const sections = createDefaultMenu(
			features({
				type: "text",
				geometry: "point",
				transform: true,
				text: "body",
			}),
		);
		expect(sections).toEqual([
			{
				id: "text",
				items: [
					{ type: "font" },
					{ type: "textFormat" },
					{ type: "textAlignment", vertical: false },
				],
			},
		]);
	});

	it("source-like -> the text section without the format item", () => {
		const sections = createDefaultMenu(
			features({ type: "markdown", transform: true, text: "source" }),
		);
		expect(sections).toEqual([
			{
				id: "text",
				// The family, size and color stay offered.
				items: [{ type: "font" }, { type: "textAlignment" }],
			},
		]);
	});

	it("no flags -> empty", () => {
		expect(createDefaultMenu(features({}))).toEqual([]);
	});
});
