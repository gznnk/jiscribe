import { describe, it, expect } from "vitest";

import type { CanvasControllerState } from "../../CanvasTypes";
import { getEffectiveSelectedIds } from "../getEffectiveSelectedIds";

type MinState = Pick<
	CanvasControllerState,
	"selectedIds" | "selectedConnectorId"
>;

describe("getEffectiveSelectedIds", () => {
	it("selectedConnectorId が null のとき selectedIds をそのまま返す", () => {
		const state: MinState = {
			selectedIds: ["a", "b"],
			selectedConnectorId: null,
		};
		expect(getEffectiveSelectedIds(state)).toEqual(["a", "b"]);
	});

	it("selectedConnectorId が null で selectedIds が空のとき [] を返す", () => {
		const state: MinState = { selectedIds: [], selectedConnectorId: null };
		expect(getEffectiveSelectedIds(state)).toEqual([]);
	});

	it("selectedConnectorId が設定されているとき [connectorId] を返す", () => {
		const state: MinState = {
			selectedIds: ["a", "b"],
			selectedConnectorId: "conn-1",
		};
		expect(getEffectiveSelectedIds(state)).toEqual(["conn-1"]);
	});

	it("connector 選択時は selectedIds を無視する", () => {
		const state: MinState = {
			selectedIds: ["a", "b", "c"],
			selectedConnectorId: "conn-x",
		};
		const result = getEffectiveSelectedIds(state);
		expect(result).toHaveLength(1);
		expect(result[0]).toBe("conn-x");
	});
});
