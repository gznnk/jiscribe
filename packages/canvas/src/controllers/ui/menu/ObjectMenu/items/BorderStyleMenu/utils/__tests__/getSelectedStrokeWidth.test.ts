import { describe, it, expect } from "vitest";

import type { CanvasControllerState } from "../../../../../../../../controllers/CanvasTypes";
import type { ObjectState } from "../../../../../../../../states/objects/base/ObjectState";
import {
	DEFAULT_STROKE_WIDTH,
	getSelectedStrokeWidth,
} from "../getSelectedStrokeWidth";

const obj = (id: string, extra?: Record<string, unknown>): ObjectState =>
	({ id, type: "rect", ...extra }) as unknown as ObjectState;

const state = (
	objects: Record<string, ObjectState>,
	selectedIds: string[],
): CanvasControllerState =>
	({ objects, selectedIds }) as unknown as CanvasControllerState;

describe("getSelectedStrokeWidth", () => {
	it("選択なし → 既定値", () => {
		expect(getSelectedStrokeWidth(state({}, []))).toBe(DEFAULT_STROKE_WIDTH);
	});

	it("strokeWidth を持つ → その値", () => {
		const s = state({ a: obj("a", { strokeWidth: 5 }) }, ["a"]);
		expect(getSelectedStrokeWidth(s)).toBe(5);
	});

	it("strokeWidth=0 もそのまま返す", () => {
		const s = state({ a: obj("a", { strokeWidth: 0 }) }, ["a"]);
		expect(getSelectedStrokeWidth(s)).toBe(0);
	});

	it("strokeWidth が数値でない → 既定値", () => {
		const s = state({ a: obj("a", { strokeWidth: "thick" }) }, ["a"]);
		expect(getSelectedStrokeWidth(s)).toBe(DEFAULT_STROKE_WIDTH);
	});
});
