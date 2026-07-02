import { describe, it, expect } from "vitest";

import type { CanvasControllerState } from "../../../../../../../../controllers/CanvasTypes";
import type { ObjectState } from "../../../../../../../../states/objects/base/ObjectState";
import { getSelectedStrokeDashType } from "../getSelectedStrokeDashType";

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

describe("getSelectedStrokeDashType (LineStyle)", () => {
	it("no selection → undefined", () => {
		expect(getSelectedStrokeDashType(state({}, []))).toBeUndefined();
	});

	it("has strokeDashType → its value", () => {
		const s = state({ a: obj("a", { strokeDashType: "dotted" }) }, ["a"]);
		expect(getSelectedStrokeDashType(s)).toBe("dotted");
	});

	it("retrieves from the connector when a connector is selected", () => {
		const s = state(
			{
				a: obj("a", { strokeDashType: "solid" }),
				conn: obj("conn", { strokeDashType: "dashed" }),
			},
			["a"],
			"conn",
		);
		expect(getSelectedStrokeDashType(s)).toBe("dashed");
	});
});
