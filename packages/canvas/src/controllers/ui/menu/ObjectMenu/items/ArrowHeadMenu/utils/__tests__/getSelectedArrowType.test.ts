import { describe, it, expect } from "vitest";

import type { CanvasControllerState } from "../../../../../../../../controllers/CanvasTypes";
import type { ObjectState } from "../../../../../../../../states/objects/base/ObjectState";
import { getSelectedArrowType } from "../getSelectedArrowType";

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

describe("getSelectedArrowType", () => {
	it("選択なし → 'None'", () => {
		expect(getSelectedArrowType(state({}, []), "startArrow")).toBe("None");
	});

	it("選択オブジェクトが該当プロパティを持つ → その値", () => {
		const s = state({ a: obj("a", { startArrow: "Triangle" }) }, ["a"]);
		expect(getSelectedArrowType(s, "startArrow")).toBe("Triangle");
	});

	it("property ごとに独立して取得する", () => {
		const s = state(
			{ a: obj("a", { startArrow: "Triangle", endArrow: "Circle" }) },
			["a"],
		);
		expect(getSelectedArrowType(s, "startArrow")).toBe("Triangle");
		expect(getSelectedArrowType(s, "endArrow")).toBe("Circle");
	});

	it("該当プロパティを持たない → 'None'", () => {
		const s = state({ a: obj("a") }, ["a"]);
		expect(getSelectedArrowType(s, "endArrow")).toBe("None");
	});

	it("値が文字列でない → 飛ばして 'None'", () => {
		const s = state({ a: obj("a", { startArrow: 123 }) }, ["a"]);
		expect(getSelectedArrowType(s, "startArrow")).toBe("None");
	});

	it("複数選択 → 最初に見つかった値を返す", () => {
		const s = state(
			{
				a: obj("a"),
				b: obj("b", { startArrow: "Diamond" }),
			},
			["a", "b"],
		);
		expect(getSelectedArrowType(s, "startArrow")).toBe("Diamond");
	});

	it("コネクター選択時は selectedConnectorId から取得する", () => {
		const s = state(
			{
				a: obj("a", { startArrow: "Triangle" }),
				conn: obj("conn", { startArrow: "Circle" }),
			},
			["a"],
			"conn",
		);
		expect(getSelectedArrowType(s, "startArrow")).toBe("Circle");
	});
});
