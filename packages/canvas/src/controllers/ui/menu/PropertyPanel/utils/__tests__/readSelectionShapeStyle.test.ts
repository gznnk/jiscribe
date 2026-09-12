import { AUTO_COLOR } from "@jiscribe/doc/model/objects/utils/autoColor";
import { SHAPE_STYLE_FALLBACK } from "@jiscribe/doc/model/objects/utils/shapeStyleFallback";
import { createObjectShapeStyleDefaultsRegistry } from "@jiscribe/doc/plugin/ObjectShapeStyleDefaultsRegistry";
import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import { readSelectionShapeStyle } from "../readSelectionShapeStyle";

/** A shape declaring both style groups, the way a rect's features do. */
const styledFeatures = {
	type: "rect",
	geometry: "rect",
	stroke: true,
	fill: true,
};

const rect = (
	id: string,
	extra?: Record<string, unknown>,
	type = "rect",
): ObjectState =>
	({
		id,
		type,
		features: { ...styledFeatures, type },
		...extra,
	}) as unknown as ObjectState;

/** A shape whose type declares neither group, so it has no say. */
const bareRect = (id: string): ObjectState =>
	({
		id,
		type: "text",
		features: { type: "text", geometry: "rect" },
	}) as unknown as ObjectState;

const group = (id: string, childIds: string[]): GroupState =>
	({ id, type: "group", childIds }) as unknown as GroupState;

const shapeStyleDefaults = createObjectShapeStyleDefaultsRegistry();

describe("readSelectionShapeStyle", () => {
	it("nothing selected → every field is none", () => {
		const style = readSelectionShapeStyle([], {}, shapeStyleDefaults, "fill");
		expect(style.fill).toEqual({ kind: "none" });
		expect(style.stroke).toEqual({ kind: "none" });
		expect(style.strokeWidth).toEqual({ kind: "none" });
		expect(style.strokeDashType).toEqual({ kind: "none" });
		expect(style.fillOpacity).toEqual({ kind: "none" });
		expect(style.strokeOpacity).toEqual({ kind: "none" });
	});

	it("nothing selected declares the group → none, even for a shape that is there", () => {
		const objects = { t: bareRect("t") };
		expect(
			readSelectionShapeStyle(["t"], objects, shapeStyleDefaults, "fill").fill,
		).toEqual({ kind: "none" });
	});

	it("one shape → its own value", () => {
		const objects = { a: rect("a", { fill: "#f00" }) };
		expect(
			readSelectionShapeStyle(["a"], objects, shapeStyleDefaults, "fill").fill,
		).toEqual({ kind: "single", value: "#f00" });
	});

	it("two shapes agreeing → one value", () => {
		const objects = {
			a: rect("a", { fill: "#f00" }),
			b: rect("b", { fill: "#f00" }),
		};
		expect(
			readSelectionShapeStyle(["a", "b"], objects, shapeStyleDefaults, "fill")
				.fill,
		).toEqual({ kind: "single", value: "#f00" });
	});

	it("two shapes disagreeing → mixed", () => {
		const objects = {
			a: rect("a", { fill: "#f00" }),
			b: rect("b", { fill: "#0f0" }),
		};
		expect(
			readSelectionShapeStyle(["a", "b"], objects, shapeStyleDefaults, "fill")
				.fill,
		).toEqual({ kind: "mixed" });
	});

	it("mixing one field leaves the others alone", () => {
		const objects = {
			a: rect("a", { fill: "#f00", strokeWidth: 2 }),
			b: rect("b", { fill: "#0f0", strokeWidth: 2 }),
		};
		const style = readSelectionShapeStyle(
			["a", "b"],
			objects,
			shapeStyleDefaults,
			"fill",
		);
		expect(style.fill).toEqual({ kind: "mixed" });
		expect(style.strokeWidth).toEqual({ kind: "single", value: 2 });
	});

	it("a value stated outright and the same value coming from the type's defaults → one value", () => {
		const defaults = createObjectShapeStyleDefaultsRegistry();
		defaults.register("plain", { fill: "#fff" });
		const objects = {
			stated: rect("stated", { fill: "#fff" }),
			// Writes nothing, so its type's default is what it draws
			defaulted: rect("defaulted", undefined, "plain"),
		};
		expect(
			readSelectionShapeStyle(
				["stated", "defaulted"],
				objects,
				defaults,
				"fill",
			).fill,
		).toEqual({ kind: "single", value: "#fff" });
	});

	it("auto stays a value of its own beside a color spelled out", () => {
		const objects = {
			a: rect("a", { fill: AUTO_COLOR }),
			b: rect("b", { fill: "#ffffff" }),
		};
		expect(
			readSelectionShapeStyle(["a", "b"], objects, shapeStyleDefaults, "fill")
				.fill,
		).toEqual({ kind: "mixed" });
	});

	it("a dash nobody declared reads as solid, not as a value of its own", () => {
		const objects = {
			a: rect("a", { strokeDashType: "solid" }),
			b: rect("b"),
		};
		expect(
			readSelectionShapeStyle(["a", "b"], objects, shapeStyleDefaults, "stroke")
				.strokeDashType,
		).toEqual({ kind: "single", value: "solid" });
	});

	it("a dash stated on one of the two → mixed", () => {
		const objects = {
			a: rect("a", { strokeDashType: "dashed" }),
			b: rect("b"),
		};
		expect(
			readSelectionShapeStyle(["a", "b"], objects, shapeStyleDefaults, "stroke")
				.strokeDashType,
		).toEqual({ kind: "mixed" });
	});

	it("an opacity nobody declared reads as the fallback, not as no value", () => {
		const objects = { a: rect("a") };
		const style = readSelectionShapeStyle(
			["a"],
			objects,
			shapeStyleDefaults,
			"fill",
		);
		expect(style.fillOpacity).toEqual({
			kind: "single",
			value: SHAPE_STYLE_FALLBACK.fillOpacity,
		});
	});

	it("an opacity stated on one of the two → mixed", () => {
		const objects = {
			a: rect("a", { fillOpacity: 0.4 }),
			b: rect("b", { fillOpacity: 1 }),
		};
		const style = readSelectionShapeStyle(
			["a", "b"],
			objects,
			shapeStyleDefaults,
			"fill",
		);
		expect(style.fillOpacity).toEqual({ kind: "mixed" });
		expect(style.fill).toEqual({
			kind: "single",
			value: SHAPE_STYLE_FALLBACK.fill,
		});
	});

	it("the two opacities are told apart", () => {
		const objects = { a: rect("a", { strokeOpacity: 0.25 }) };
		const style = readSelectionShapeStyle(
			["a"],
			objects,
			shapeStyleDefaults,
			"stroke",
		);
		expect(style.strokeOpacity).toEqual({ kind: "single", value: 0.25 });
		expect(style.fillOpacity).toEqual({
			kind: "single",
			value: SHAPE_STYLE_FALLBACK.fillOpacity,
		});
	});

	it("descendants of a selected group have their say", () => {
		const objects = {
			g: group("g", ["a", "b"]),
			a: rect("a", { fill: "#f00" }),
			b: rect("b", { fill: "#0f0" }),
		};
		expect(
			readSelectionShapeStyle(["g"], objects, shapeStyleDefaults, "fill").fill,
		).toEqual({ kind: "mixed" });
	});

	it("a connector in the selection is one voice among the strokes", () => {
		const connector = {
			id: "c",
			type: "connector",
			features: { type: "connector", geometry: "poly", stroke: true },
			stroke: "#00f",
		} as unknown as ObjectState;
		const objects = { a: rect("a", { stroke: "#f00" }), c: connector };
		expect(
			readSelectionShapeStyle(["a", "c"], objects, shapeStyleDefaults, "stroke")
				.stroke,
		).toEqual({ kind: "mixed" });
		expect(
			readSelectionShapeStyle(["c"], objects, shapeStyleDefaults, "stroke")
				.stroke,
		).toEqual({ kind: "single", value: "#00f" });
	});
});
