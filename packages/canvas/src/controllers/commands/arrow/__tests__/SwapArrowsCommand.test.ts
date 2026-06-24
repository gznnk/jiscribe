import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";
import type { PolylineState } from "../../../../states/objects/primitives/polyline/PolylineState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { SwapArrowsCommand } from "../SwapArrowsCommand";

const makeConnector = (
	id: string,
	startArrow: string | undefined,
	endArrow: string | undefined,
): ConnectorState =>
	({
		id,
		type: "connector",
		startArrow,
		endArrow,
	}) as unknown as ConnectorState;

const makePolyline = (
	id: string,
	startArrow: string | undefined,
	endArrow: string | undefined,
): PolylineState =>
	({ id, type: "polyline", startArrow, endArrow }) as unknown as PolylineState;

const makeRect = (id: string): ObjectState =>
	({ id, type: "rect" }) as ObjectState;

const makeState = (params: {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
	selectedConnectorId?: string | null;
}): CanvasControllerState =>
	({
		selectedConnectorId: null,
		...params,
		commitVersion: 0,
	}) as unknown as CanvasControllerState;

describe("SwapArrowsCommand", () => {
	describe("コネクター選択時", () => {
		it("start/end の矢印を入れ替える", () => {
			const state = makeState({
				selectedIds: [],
				selectedConnectorId: "c1",
				objects: { c1: makeConnector("c1", "Triangle", "None") },
			});
			const next = SwapArrowsCommand.execute(state);
			const conn = next.objects["c1"] as ConnectorState;
			expect(conn.startArrow).toBe("None");
			expect(conn.endArrow).toBe("Triangle");
			expect(next.commitVersion).toBe(1);
		});

		it("未指定の矢印は None として扱って入れ替える", () => {
			const state = makeState({
				selectedIds: [],
				selectedConnectorId: "c1",
				objects: { c1: makeConnector("c1", "Triangle", undefined) },
			});
			const conn = SwapArrowsCommand.execute(state).objects[
				"c1"
			] as ConnectorState;
			expect(conn.startArrow).toBe("None");
			expect(conn.endArrow).toBe("Triangle");
		});
	});

	describe("ポリライン選択時", () => {
		it("選択中の各ポリラインで矢印を入れ替える", () => {
			const state = makeState({
				selectedIds: ["p1"],
				objects: { p1: makePolyline("p1", "Triangle", "None") },
			});
			const poly = SwapArrowsCommand.execute(state).objects[
				"p1"
			] as PolylineState;
			expect(poly.startArrow).toBe("None");
			expect(poly.endArrow).toBe("Triangle");
		});

		it("ポリライン以外が混在しても対象だけ入れ替える", () => {
			const state = makeState({
				selectedIds: ["p1", "r1"],
				objects: {
					p1: makePolyline("p1", "Triangle", "None"),
					r1: makeRect("r1"),
				},
			});
			const next = SwapArrowsCommand.execute(state);
			const poly = next.objects["p1"] as PolylineState;
			expect(poly.startArrow).toBe("None");
			expect(poly.endArrow).toBe("Triangle");
			// rect は変化しない（参照そのまま）
			expect(next.objects["r1"]).toBe(state.objects["r1"]);
		});

		it("対象ポリラインが無ければ state をそのまま返す", () => {
			const state = makeState({
				selectedIds: ["r1"],
				objects: { r1: makeRect("r1") },
			});
			expect(SwapArrowsCommand.execute(state)).toBe(state);
		});
	});

	describe("canExecute", () => {
		it("選択コネクターがあれば実行可能", () => {
			const state = makeState({
				selectedIds: [],
				selectedConnectorId: "c1",
				objects: { c1: makeConnector("c1", "None", "None") },
			});
			expect(SwapArrowsCommand.canExecute(state)).toBe(true);
		});

		it("選択にポリラインが含まれれば実行可能", () => {
			const state = makeState({
				selectedIds: ["p1"],
				objects: { p1: makePolyline("p1", "None", "None") },
			});
			expect(SwapArrowsCommand.canExecute(state)).toBe(true);
		});

		it("矢印を持たない選択のみなら実行不可", () => {
			const state = makeState({
				selectedIds: ["r1"],
				objects: { r1: makeRect("r1") },
			});
			expect(SwapArrowsCommand.canExecute(state)).toBe(false);
		});
	});
});
