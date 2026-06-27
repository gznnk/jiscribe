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
	selectedConnectorId: string | null = null,
): CanvasControllerState =>
	({
		objects,
		selectedIds,
		selectedConnectorId,
	}) as unknown as CanvasControllerState;

describe("getSelectedStrokeWidth (LineStyle)", () => {
	it("選択なし → 既定値", () => {
		expect(getSelectedStrokeWidth(state({}, []))).toBe(DEFAULT_STROKE_WIDTH);
	});

	it("strokeWidth を持つ → その値", () => {
		const s = state({ a: obj("a", { strokeWidth: 8 }) }, ["a"]);
		expect(getSelectedStrokeWidth(s)).toBe(8);
	});

	it("strokeWidth が数値でない → 既定値", () => {
		const s = state({ a: obj("a", { strokeWidth: null }) }, ["a"]);
		expect(getSelectedStrokeWidth(s)).toBe(DEFAULT_STROKE_WIDTH);
	});

	it("コネクター選択時はそのコネクターから取得する", () => {
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
