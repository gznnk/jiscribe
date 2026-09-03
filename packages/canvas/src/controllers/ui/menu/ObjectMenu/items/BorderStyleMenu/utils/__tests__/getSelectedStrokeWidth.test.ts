import { DEFAULT_STROKE_WIDTH } from "@jiscribe/doc/model/objects/base/StrokeStyleDoc";
import { describe, it, expect } from "vitest";

import type { CanvasControllerState } from "../../../../../../../../controllers/CanvasTypes";
import type { ObjectState } from "../../../../../../../../states/objects/base/ObjectState";
import { getSelectedStrokeWidth } from "../getSelectedStrokeWidth";

const obj = (id: string, extra?: Record<string, unknown>): ObjectState =>
	({ id, type: "rect", ...extra }) as unknown as ObjectState;

const state = (
	objects: Record<string, ObjectState>,
	selectedIds: string[],
): CanvasControllerState =>
	({ objects, selectedIds }) as unknown as CanvasControllerState;

describe("getSelectedStrokeWidth", () => {
	it("no selection → default value", () => {
		expect(getSelectedStrokeWidth(state({}, []))).toBe(DEFAULT_STROKE_WIDTH);
	});

	it("has strokeWidth → its value", () => {
		const s = state({ a: obj("a", { strokeWidth: 5 }) }, ["a"]);
		expect(getSelectedStrokeWidth(s)).toBe(5);
	});

	it("returns strokeWidth=0 as-is", () => {
		const s = state({ a: obj("a", { strokeWidth: 0 }) }, ["a"]);
		expect(getSelectedStrokeWidth(s)).toBe(0);
	});

	it("strokeWidth is not a number → default value", () => {
		const s = state({ a: obj("a", { strokeWidth: "thick" }) }, ["a"]);
		expect(getSelectedStrokeWidth(s)).toBe(DEFAULT_STROKE_WIDTH);
	});
});
