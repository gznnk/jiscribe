import { DEFAULT_STROKE_WIDTH } from "@jiscribe/doc/model/objects/base/StrokeStyleDoc";
import { createObjectShapeStyleDefaultsRegistry } from "@jiscribe/doc/plugin/ObjectShapeStyleDefaultsRegistry";
import { describe, it, expect } from "vitest";

import type { CanvasControllerState } from "../../../../../../../../controllers/CanvasTypes";
import type { ObjectState } from "../../../../../../../../states/objects/base/ObjectState";
import { getSelectedStrokeWidth } from "../getSelectedStrokeWidth";

/** A rect, declaring the stroke the lookup finds it by (getFirstSelectedWithFeature). */
const obj = (id: string, extra?: Record<string, unknown>): ObjectState =>
	({
		id,
		type: "rect",
		features: { type: "rect", geometry: "rect", stroke: true, fill: true },
		...extra,
	}) as unknown as ObjectState;

const state = (
	objects: Record<string, ObjectState>,
	selectedIds: string[],
): CanvasControllerState =>
	({ objects, selectedIds }) as unknown as CanvasControllerState;

/** No type registered, so an unset width lands on the shared last resort. */
const shapeStyleDefaults = createObjectShapeStyleDefaultsRegistry();

describe("getSelectedStrokeWidth", () => {
	it("no selection → default value", () => {
		expect(getSelectedStrokeWidth(state({}, []), shapeStyleDefaults)).toBe(
			DEFAULT_STROKE_WIDTH,
		);
	});

	it("has strokeWidth → its value", () => {
		const s = state({ a: obj("a", { strokeWidth: 5 }) }, ["a"]);
		expect(getSelectedStrokeWidth(s, shapeStyleDefaults)).toBe(5);
	});

	it("returns strokeWidth=0 as-is", () => {
		const s = state({ a: obj("a", { strokeWidth: 0 }) }, ["a"]);
		expect(getSelectedStrokeWidth(s, shapeStyleDefaults)).toBe(0);
	});

	it("strokeWidth is not a number → default value", () => {
		const s = state({ a: obj("a", { strokeWidth: "thick" }) }, ["a"]);
		expect(getSelectedStrokeWidth(s, shapeStyleDefaults)).toBe(
			DEFAULT_STROKE_WIDTH,
		);
	});

	it("falls to the type's own default when the document wrote no width at all", () => {
		const typeDefaults = createObjectShapeStyleDefaultsRegistry();
		typeDefaults.register("rect", { strokeWidth: 4 });
		const s = state({ a: obj("a") }, ["a"]);
		expect(getSelectedStrokeWidth(s, typeDefaults)).toBe(4);
	});
});
