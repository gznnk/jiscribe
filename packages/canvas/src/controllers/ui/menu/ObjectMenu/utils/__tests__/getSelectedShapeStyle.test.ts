import { SHAPE_STYLE_FALLBACK } from "@jiscribe/doc/model/objects/utils/shapeStyleFallback";
import { createObjectShapeStyleDefaultsRegistry } from "@jiscribe/doc/plugin/ObjectShapeStyleDefaultsRegistry";
import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import { getSelectedShapeStyle } from "../getSelectedShapeStyle";

/** A shape declaring both style groups, the way a rect's features do. */
const styledFeatures = {
	type: "rect",
	geometry: "rect",
	stroke: true,
	fill: true,
};

const obj = (
	id: string,
	extra?: Record<string, unknown>,
	features: Record<string, unknown> = styledFeatures,
): ObjectState =>
	({ id, type: "rect", features, ...extra }) as unknown as ObjectState;

/** No type registered, so unset fields land on the shared last resort. */
const shapeStyleDefaults = createObjectShapeStyleDefaultsRegistry();

describe("getSelectedShapeStyle", () => {
	it("no selection → the shared fallback, with no dash", () => {
		expect(getSelectedShapeStyle([], {}, shapeStyleDefaults, "stroke")).toEqual(
			{
				stroke: SHAPE_STYLE_FALLBACK.stroke,
				strokeWidth: SHAPE_STYLE_FALLBACK.strokeWidth,
				strokeOpacity: SHAPE_STYLE_FALLBACK.strokeOpacity,
				fill: SHAPE_STYLE_FALLBACK.fill,
				fillOpacity: SHAPE_STYLE_FALLBACK.fillOpacity,
				strokeDashType: undefined,
			},
		);
	});

	it("own values → returned as they stand", () => {
		const objects = {
			a: obj("a", {
				stroke: "#f00",
				strokeWidth: 8,
				strokeDashType: "dotted",
				fill: "#0f0",
			}),
		};
		expect(
			getSelectedShapeStyle(["a"], objects, shapeStyleDefaults, "stroke"),
		).toEqual({
			stroke: "#f00",
			strokeWidth: 8,
			strokeDashType: "dotted",
			strokeOpacity: SHAPE_STYLE_FALLBACK.strokeOpacity,
			fill: "#0f0",
			fillOpacity: SHAPE_STYLE_FALLBACK.fillOpacity,
		});
	});

	it("returns strokeWidth=0 as-is", () => {
		const objects = { a: obj("a", { strokeWidth: 0 }) };
		expect(
			getSelectedShapeStyle(["a"], objects, shapeStyleDefaults, "stroke")
				.strokeWidth,
		).toBe(0);
	});

	it("values of the wrong type → resolved as if unset", () => {
		const objects = {
			a: obj("a", { stroke: 5, strokeWidth: "thick", strokeDashType: 1 }),
		};
		expect(
			getSelectedShapeStyle(["a"], objects, shapeStyleDefaults, "stroke"),
		).toEqual({
			stroke: SHAPE_STYLE_FALLBACK.stroke,
			strokeWidth: SHAPE_STYLE_FALLBACK.strokeWidth,
			strokeOpacity: SHAPE_STYLE_FALLBACK.strokeOpacity,
			fill: SHAPE_STYLE_FALLBACK.fill,
			fillOpacity: SHAPE_STYLE_FALLBACK.fillOpacity,
			strokeDashType: undefined,
		});
	});

	it("falls to the type's own defaults when the document wrote nothing", () => {
		const typeDefaults = createObjectShapeStyleDefaultsRegistry();
		typeDefaults.register("rect", { strokeWidth: 4, strokeDashType: "dashed" });
		const style = getSelectedShapeStyle(
			["a"],
			{ a: obj("a") },
			typeDefaults,
			"stroke",
		);
		expect(style.strokeWidth).toBe(4);
		expect(style.strokeDashType).toBe("dashed");
	});

	it("feature 'fill' skips an object whose type declares stroke only", () => {
		const strokeOnly = obj(
			"a",
			{ fill: "#f00" },
			{
				type: "polyline",
				geometry: "poly",
				stroke: true,
			},
		);
		const filled = obj("b", { fill: "#0f0" });
		const objects = { a: strokeOnly, b: filled };
		expect(
			getSelectedShapeStyle(["a", "b"], objects, shapeStyleDefaults, "fill")
				.fill,
		).toBe("#0f0");
	});
});
