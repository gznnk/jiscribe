import { AUTO_COLOR } from "@jiscribe/doc/model/objects/utils/autoColor";
import { SHAPE_STYLE_FALLBACK } from "@jiscribe/doc/model/objects/utils/shapeStyleFallback";
import type {
	ObjectShapeStyleDefaultsRegistry,
	ShapeStyleGroup,
} from "@jiscribe/doc/registries/ObjectShapeStyleDefaultsRegistry";
import { createObjectShapeStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectShapeStyleDefaultsRegistry";
import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { selectionOf } from "../../../../selection/__tests__/support/selectionOf";
import { coreStyleTable } from "../../../../style/coreStyleTable";
import type { StyleIntentRegistries } from "../../../../style/ObjectStyleRegistry";
import { createObjectStyleRegistry } from "../../../../style/ObjectStyleRegistry";
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

/**
 * The production wiring of the fill intent for these fixtures: every type they
 * use gets the table its own features derive (applyObjectDefinition does the
 * same with each ObjectTypeDefinition).
 */
const registriesOf = (
	objects: Record<string, ObjectState>,
	defaults: ObjectShapeStyleDefaultsRegistry,
): StyleIntentRegistries => {
	const objectStyle = createObjectStyleRegistry();
	for (const object of Object.values(objects)) {
		if (object.features) {
			objectStyle.register(object.type, coreStyleTable(object.features));
		}
	}
	return { objectStyle, objectShapeStyleDefaults: defaults };
};

/** The reader called with a state and registries built from the fixture at hand. */
const readStyle = (
	selectedIds: readonly string[],
	objects: Record<string, ObjectState>,
	defaults: ObjectShapeStyleDefaultsRegistry,
	styleGroup: ShapeStyleGroup,
) =>
	readSelectionShapeStyle(
		{ selection: selectionOf(selectedIds), objects } as CanvasControllerState,
		registriesOf(objects, defaults),
		styleGroup,
	);

describe("readSelectionShapeStyle", () => {
	it("nothing selected → every field is none", () => {
		const style = readStyle([], {}, shapeStyleDefaults, "fill");
		expect(style.fill).toEqual({ kind: "none" });
		expect(style.stroke).toEqual({ kind: "none" });
		expect(style.strokeWidth).toEqual({ kind: "none" });
		expect(style.strokeDashType).toEqual({ kind: "none" });
		expect(style.fillOpacity).toEqual({ kind: "none" });
		expect(style.strokeOpacity).toEqual({ kind: "none" });
	});

	it("nothing selected declares the group → none, even for a shape that is there", () => {
		const objects = { t: bareRect("t") };
		expect(readStyle(["t"], objects, shapeStyleDefaults, "fill").fill).toEqual({
			kind: "none",
		});
	});

	it("one shape → its own value", () => {
		const objects = { a: rect("a", { fill: "#f00" }) };
		expect(readStyle(["a"], objects, shapeStyleDefaults, "fill").fill).toEqual({
			kind: "single",
			value: "#f00",
		});
	});

	it("two shapes agreeing → one value", () => {
		const objects = {
			a: rect("a", { fill: "#f00" }),
			b: rect("b", { fill: "#f00" }),
		};
		expect(
			readStyle(["a", "b"], objects, shapeStyleDefaults, "fill").fill,
		).toEqual({ kind: "single", value: "#f00" });
	});

	it("two shapes disagreeing → mixed", () => {
		const objects = {
			a: rect("a", { fill: "#f00" }),
			b: rect("b", { fill: "#0f0" }),
		};
		expect(
			readStyle(["a", "b"], objects, shapeStyleDefaults, "fill").fill,
		).toEqual({ kind: "mixed", values: ["#f00", "#0f0"] });
	});

	it("mixing one field leaves the others alone", () => {
		const objects = {
			a: rect("a", { fill: "#f00", strokeWidth: 2 }),
			b: rect("b", { fill: "#0f0", strokeWidth: 2 }),
		};
		const style = readStyle(["a", "b"], objects, shapeStyleDefaults, "fill");
		expect(style.fill).toEqual({ kind: "mixed", values: ["#f00", "#0f0"] });
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
			readStyle(["stated", "defaulted"], objects, defaults, "fill").fill,
		).toEqual({ kind: "single", value: "#fff" });
	});

	it("auto stays a value of its own beside a color spelled out", () => {
		const objects = {
			a: rect("a", { fill: AUTO_COLOR }),
			b: rect("b", { fill: "#ffffff" }),
		};
		expect(
			readStyle(["a", "b"], objects, shapeStyleDefaults, "fill").fill,
		).toEqual({ kind: "mixed", values: [AUTO_COLOR, "#ffffff"] });
	});

	it("a dash nobody declared reads as solid, not as a value of its own", () => {
		const objects = {
			a: rect("a", { strokeDashType: "solid" }),
			b: rect("b"),
		};
		expect(
			readStyle(["a", "b"], objects, shapeStyleDefaults, "stroke")
				.strokeDashType,
		).toEqual({ kind: "single", value: "solid" });
	});

	it("a dash stated on one of the two → mixed", () => {
		const objects = {
			a: rect("a", { strokeDashType: "dashed" }),
			b: rect("b"),
		};
		expect(
			readStyle(["a", "b"], objects, shapeStyleDefaults, "stroke")
				.strokeDashType,
		).toEqual({ kind: "mixed", values: ["dashed", "solid"] });
	});

	it("an opacity nobody declared reads as the fallback, not as no value", () => {
		const objects = { a: rect("a") };
		const style = readStyle(["a"], objects, shapeStyleDefaults, "fill");
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
		const style = readStyle(["a", "b"], objects, shapeStyleDefaults, "fill");
		// The first shape's own opacity, not the fallback: the row's arrows step
		// from it (PropertyNumberField).
		expect(style.fillOpacity).toEqual({ kind: "mixed", values: [0.4, 1] });
		expect(style.fill).toEqual({
			kind: "single",
			value: SHAPE_STYLE_FALLBACK.fill,
		});
	});

	it("the two opacities are told apart", () => {
		const objects = { a: rect("a", { strokeOpacity: 0.25 }) };
		const style = readStyle(["a"], objects, shapeStyleDefaults, "stroke");
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
		expect(readStyle(["g"], objects, shapeStyleDefaults, "fill").fill).toEqual({
			kind: "mixed",
			values: ["#f00", "#0f0"],
		});
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
			readStyle(["a", "c"], objects, shapeStyleDefaults, "stroke").stroke,
		).toEqual({ kind: "mixed", values: ["#f00", "#00f"] });
		expect(
			readStyle(["c"], objects, shapeStyleDefaults, "stroke").stroke,
		).toEqual({ kind: "single", value: "#00f" });
	});
});
