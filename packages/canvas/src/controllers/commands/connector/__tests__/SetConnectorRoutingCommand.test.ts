import type { Point } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import {
	SetRoutingOrthogonalCommand,
	SetRoutingStraightCommand,
} from "../SetConnectorRoutingCommand";

const registries = createTestRegistries();

/** By default both ends are free (not a self-loop). Passing owners makes the endpoints owned. */
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
					owner: { id: owners.sourceId },
					anchor: { kind: "center" },
				}
			: { anchor: { kind: "free", point: { x: 0, y: 0 } } },
		target: owners?.targetId
			? {
					owner: { id: owners.targetId },
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
		it("discards manual waypoints (points) when switching to orthogonal", () => {
			const waypoints: Point[] = [{ x: 10, y: 20 }];
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1: makeConnector("c1", "straight", waypoints) },
				selectedVertex: { objectId: "c1", vertexIndex: 0 },
			});

			const next = SetRoutingOrthogonalCommand.execute(state, registries);
			const conn = next.objects["c1"] as ConnectorState;

			expect(conn.routing).toBe("orthogonal");
			expect(conn.points).toEqual([]);
			// the waypoint handles disappear, so the selected waypoint is cleared
			expect(next.selectedVertex).toBeNull();
			expect(next.commitVersion).toBe(1);
		});
	});

	describe("SetRoutingStraightCommand", () => {
		it("preserves existing waypoints when switching to straight", () => {
			const waypoints: Point[] = [{ x: 10, y: 20 }];
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1: makeConnector("c1", "orthogonal", waypoints) },
			});

			const next = SetRoutingStraightCommand.execute(state, registries);
			const conn = next.objects["c1"] as ConnectorState;

			expect(conn.routing).toBe("straight");
			expect(conn.points).toBe(waypoints);
			expect(next.commitVersion).toBe(1);
		});
	});

	describe("when the effective routing does not change", () => {
		it("applying orthogonal to the default (routing omitted) is a no-op (writes no redundant value)", () => {
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1: makeConnector("c1", undefined, []) },
			});

			const next = SetRoutingOrthogonalCommand.execute(state, registries);

			// same state reference (no history entry is created)
			expect(next).toBe(state);
			const conn = next.objects["c1"] as ConnectorState;
			expect(conn.routing).toBeUndefined();
		});

		it("re-applying straight to straight is a no-op", () => {
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1: makeConnector("c1", "straight", [{ x: 1, y: 2 }]) },
			});
			expect(SetRoutingStraightCommand.execute(state, registries)).toBe(state);
		});
	});

	describe("canExecute", () => {
		it("is executable when a connector is selected", () => {
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1: makeConnector("c1", undefined, []) },
			});
			expect(SetRoutingStraightCommand.canExecute(state, registries)).toBe(
				true,
			);
			expect(SetRoutingOrthogonalCommand.canExecute(state, registries)).toBe(
				true,
			);
		});

		it("is not executable when no connector is selected", () => {
			const state = makeState({
				selectedConnectorId: null,
				objects: { r1: makeRect("r1") },
			});
			expect(SetRoutingStraightCommand.canExecute(state, registries)).toBe(
				false,
			);
			expect(SetRoutingOrthogonalCommand.canExecute(state, registries)).toBe(
				false,
			);
		});

		it("self-loops cannot be straight but can be orthogonal (orthogonal only)", () => {
			const state = makeState({
				selectedConnectorId: "c1",
				objects: {
					c1: makeConnector("c1", undefined, [], {
						sourceId: "r1",
						targetId: "r1",
					}),
				},
			});
			expect(SetRoutingStraightCommand.canExecute(state, registries)).toBe(
				false,
			);
			expect(SetRoutingOrthogonalCommand.canExecute(state, registries)).toBe(
				true,
			);
		});
	});
});
