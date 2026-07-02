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
	it("no selection → 'None'", () => {
		expect(getSelectedArrowType(state({}, []), "startArrow")).toBe("None");
	});

	it("the selected object has the relevant property → its value", () => {
		const s = state({ a: obj("a", { startArrow: "Triangle" }) }, ["a"]);
		expect(getSelectedArrowType(s, "startArrow")).toBe("Triangle");
	});

	it("retrieves each property independently", () => {
		const s = state(
			{ a: obj("a", { startArrow: "Triangle", endArrow: "Circle" }) },
			["a"],
		);
		expect(getSelectedArrowType(s, "startArrow")).toBe("Triangle");
		expect(getSelectedArrowType(s, "endArrow")).toBe("Circle");
	});

	it("does not have the relevant property → 'None'", () => {
		const s = state({ a: obj("a") }, ["a"]);
		expect(getSelectedArrowType(s, "endArrow")).toBe("None");
	});

	it("value is not a string → skipped, 'None'", () => {
		const s = state({ a: obj("a", { startArrow: 123 }) }, ["a"]);
		expect(getSelectedArrowType(s, "startArrow")).toBe("None");
	});

	it("multiple selection → returns the first value found", () => {
		const s = state(
			{
				a: obj("a"),
				b: obj("b", { startArrow: "Diamond" }),
			},
			["a", "b"],
		);
		expect(getSelectedArrowType(s, "startArrow")).toBe("Diamond");
	});

	it("retrieves from selectedConnectorId when a connector is selected", () => {
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
