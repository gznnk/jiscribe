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
	selectedConnectorId: string | null = null,
): CanvasControllerState =>
	({
		objects,
		selectedIds,
		selectedConnectorId,
	}) as unknown as CanvasControllerState;

describe("getSelectedStrokeWidth (LineStyle)", () => {
	it("no selection → default value", () => {
		expect(getSelectedStrokeWidth(state({}, []))).toBe(DEFAULT_STROKE_WIDTH);
	});

	it("has strokeWidth → its value", () => {
		const s = state({ a: obj("a", { strokeWidth: 8 }) }, ["a"]);
		expect(getSelectedStrokeWidth(s)).toBe(8);
	});

	it("strokeWidth is not a number → default value", () => {
		const s = state({ a: obj("a", { strokeWidth: null }) }, ["a"]);
		expect(getSelectedStrokeWidth(s)).toBe(DEFAULT_STROKE_WIDTH);
	});

	it("retrieves from the connector when a connector is selected", () => {
		const s = state(
			{
				a: obj("a", { strokeWidth: 1 }),
				conn: obj("conn", { strokeWidth: 4 }),
			},
			["a"],
			"conn",
		);
		expect(getSelectedStrokeWidth(s)).toBe(4);
	});
});
