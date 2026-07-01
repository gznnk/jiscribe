import { describe, it, expect } from "vitest";

import type { CanvasControllerState } from "../../CanvasTypes";
import { getEffectiveSelectedIds } from "../getEffectiveSelectedIds";

type MinState = Pick<
	CanvasControllerState,
	"selectedIds" | "selectedConnectorId"
>;

describe("getEffectiveSelectedIds", () => {
	it("returns selectedIds as-is when selectedConnectorId is null", () => {
		const state: MinState = {
			selectedIds: ["a", "b"],
			selectedConnectorId: null,
		};
		expect(getEffectiveSelectedIds(state)).toEqual(["a", "b"]);
	});

	it("returns [] when selectedConnectorId is null and selectedIds is empty", () => {
		const state: MinState = { selectedIds: [], selectedConnectorId: null };
		expect(getEffectiveSelectedIds(state)).toEqual([]);
	});

	it("returns [connectorId] when selectedConnectorId is set", () => {
		const state: MinState = {
			selectedIds: ["a", "b"],
			selectedConnectorId: "conn-1",
		};
		expect(getEffectiveSelectedIds(state)).toEqual(["conn-1"]);
	});

	it("ignores selectedIds when a connector is selected", () => {
		const state: MinState = {
			selectedIds: ["a", "b", "c"],
			selectedConnectorId: "conn-x",
		};
		const result = getEffectiveSelectedIds(state);
		expect(result).toHaveLength(1);
		expect(result[0]).toBe("conn-x");
	});
});
