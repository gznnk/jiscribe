import type { Point } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import {
	SetRoutingOrthogonalCommand,
	SetRoutingStraightCommand,
} from "../SetConnectorRoutingCommand";

/** 既定は両端 free（自己ループでない）。owners を渡すと owned 端点になる。 */
const makeConnector = (
	id: string,
	routing: "straight" | "orthogonal" | undefined,
	points: Point[],
	owners?: { sourceId?: string; targetId?: string },
): ConnectorState =>
	({
		id,
		type: "connector",
		routing,
		points,
		source: owners?.sourceId
			? {
					owner: { type: "rect", id: owners.sourceId },
					anchor: { kind: "center" },
				}
			: { anchor: { kind: "free", point: { x: 0, y: 0 } } },
		target: owners?.targetId
			? {
					owner: { type: "rect", id: owners.targetId },
					anchor: { kind: "center" },
				}
			: { anchor: { kind: "free", point: { x: 10, y: 10 } } },
	}) as unknown as ConnectorState;

const makeRect = (id: string): ObjectState =>
	({ id, type: "rect" }) as ObjectState;

const makeState = (params: {
	selectedConnectorId: string | null;
	objects: Record<string, ObjectState>;
	selectedVertex?: CanvasControllerState["selectedVertex"];
}): CanvasControllerState =>
	({
		selectedIds: [],
		commitVersion: 0,
		selectedVertex: null,
		...params,
	}) as unknown as CanvasControllerState;

describe("SetConnectorRoutingCommand", () => {
	describe("SetRoutingOrthogonalCommand", () => {
		it("orthogonal へ切り替えると手動 waypoint(points) を破棄する", () => {
			const waypoints: Point[] = [{ x: 10, y: 20 }];
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1: makeConnector("c1", "straight", waypoints) },
				selectedVertex: { objectId: "c1", vertexIndex: 0 },
			});

			const next = SetRoutingOrthogonalCommand.execute(state);
			const conn = next.objects["c1"] as ConnectorState;

			expect(conn.routing).toBe("orthogonal");
			expect(conn.points).toEqual([]);
			// waypoint ハンドルが消えるため選択中 waypoint はクリアする
			expect(next.selectedVertex).toBeNull();
			expect(next.commitVersion).toBe(1);
		});
	});

	describe("SetRoutingStraightCommand", () => {
		it("straight へ切り替えても既存 waypoint を温存する", () => {
			const waypoints: Point[] = [{ x: 10, y: 20 }];
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1: makeConnector("c1", "orthogonal", waypoints) },
			});

			const next = SetRoutingStraightCommand.execute(state);
			const conn = next.objects["c1"] as ConnectorState;

			expect(conn.routing).toBe("straight");
			expect(conn.points).toBe(waypoints);
			expect(next.commitVersion).toBe(1);
		});
	});

	describe("実効 routing が変わらない場合", () => {
		it("既定(routing 省略)へ orthogonal を適用しても no-op（冗長な値を書き込まない）", () => {
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1: makeConnector("c1", undefined, []) },
			});

			const next = SetRoutingOrthogonalCommand.execute(state);

			// state 参照そのまま（履歴エントリも作らない）
			expect(next).toBe(state);
			const conn = next.objects["c1"] as ConnectorState;
			expect(conn.routing).toBeUndefined();
		});

		it("straight へ straight を再適用しても no-op", () => {
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1: makeConnector("c1", "straight", [{ x: 1, y: 2 }]) },
			});
			expect(SetRoutingStraightCommand.execute(state)).toBe(state);
		});
	});

	describe("canExecute", () => {
		it("コネクターが選択されていれば実行可能", () => {
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1: makeConnector("c1", undefined, []) },
			});
			expect(SetRoutingStraightCommand.canExecute(state)).toBe(true);
			expect(SetRoutingOrthogonalCommand.canExecute(state)).toBe(true);
		});

		it("コネクター未選択なら実行不可", () => {
			const state = makeState({
				selectedConnectorId: null,
				objects: { r1: makeRect("r1") },
			});
			expect(SetRoutingStraightCommand.canExecute(state)).toBe(false);
			expect(SetRoutingOrthogonalCommand.canExecute(state)).toBe(false);
		});

		it("自己ループは straight 不可・orthogonal 可（直交専用）", () => {
			const state = makeState({
				selectedConnectorId: "c1",
				objects: {
					c1: makeConnector("c1", undefined, [], {
						sourceId: "r1",
						targetId: "r1",
					}),
				},
			});
			expect(SetRoutingStraightCommand.canExecute(state)).toBe(false);
			expect(SetRoutingOrthogonalCommand.canExecute(state)).toBe(true);
		});
	});
});
