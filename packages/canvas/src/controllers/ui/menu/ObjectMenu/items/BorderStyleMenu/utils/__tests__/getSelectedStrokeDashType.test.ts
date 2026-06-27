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
	it("選択なし → undefined", () => {
		expect(getSelectedStrokeDashType(state({}, []))).toBeUndefined();
	});

	it("strokeDashType を持つ → その値", () => {
		const s = state({ a: obj("a", { strokeDashType: "dashed" }) }, ["a"]);
		expect(getSelectedStrokeDashType(s)).toBe("dashed");
	});

	it("strokeDashType が文字列でない → undefined", () => {
		const s = state({ a: obj("a", { strokeDashType: 1 }) }, ["a"]);
		expect(getSelectedStrokeDashType(s)).toBeUndefined();
	});
});
