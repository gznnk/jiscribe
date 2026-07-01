import { describe, it, expect } from "vitest";

import type { CanvasControllerState } from "../../../../../../../../controllers/CanvasTypes";
import type { ObjectState } from "../../../../../../../../states/objects/base/ObjectState";
import { getSelectedStrokeDashType } from "../getSelectedStrokeDashType";

const obj = (id: string, extra?: Record<string, unknown>): ObjectState =>
	({ id, type: "rect", ...extra }) as unknown as ObjectState;

const state = (
	objects: Record<string, ObjectState>,
	selectedIds: string[],
): CanvasControllerState =>
	({ objects, selectedIds }) as unknown as CanvasControllerState;

describe("getSelectedStrokeDashType", () => {
	it("no selection → undefined", () => {
		expect(getSelectedStrokeDashType(state({}, []))).toBeUndefined();
	});

	it("has strokeDashType → its value", () => {
		const s = state({ a: obj("a", { strokeDashType: "dashed" }) }, ["a"]);
		expect(getSelectedStrokeDashType(s)).toBe("dashed");
	});

	it("strokeDashType is not a string → undefined", () => {
		const s = state({ a: obj("a", { strokeDashType: 1 }) }, ["a"]);
		expect(getSelectedStrokeDashType(s)).toBeUndefined();
	});
});
