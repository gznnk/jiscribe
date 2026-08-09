import type { Point } from "@jiscribe/geometry";
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

/**
 * By default both ends are free (not a self-loop). Passing owners makes the endpoints owned;
 * passing freePoints places the free endpoints (defaults: source (0,0), target (10,10)).
 */
const makeConnector = (
	id: string,
	routing: "straight" | "orthogonal" | undefined,
	points: Point[],
	owners?: { sourceId?: string; targetId?: string },
	freePoints?: { source?: Point; target?: Point },
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
			: {
					anchor: {
						kind: "free",
						point: freePoints?.source ?? { x: 0, y: 0 },
					},
				},
		target: owners?.targetId
			? {
					owner: { id: owners.targetId },
					anchor: { kind: "center" },
				}
			: {
					anchor: {
						kind: "free",
						point: freePoints?.target ?? { x: 10, y: 10 },
					},
				},
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
		it("keeps the route's vertices when switching to orthogonal (only ResetConnectorRoute drops them)", () => {
			const waypoints: Point[] = [{ x: 10, y: 20 }];
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1: makeConnector("c1", "straight", waypoints) },
				selectedVertex: { objectId: "c1", vertexIndex: 0 },
			});

			const next = SetRoutingOrthogonalCommand.execute(state, registries);
			const conn = next.objects["c1"] as ConnectorState;

			expect(conn.routing).toBe("orthogonal");
			expect(conn.points).toBe(waypoints);
			// the per-vertex handles disappear under orthogonal, so the selected vertex is cleared
			expect(next.selectedVertex).toBeNull();
			expect(next.commitVersion).toBe(1);
		});
	});

	describe("SetRoutingStraightCommand", () => {
		it("switching to straight bakes the drawn path, not the stale stored vertices", () => {
			// Stored while the target sat at y=100; the target has since moved to y=120, so the
			// drawn path (alignVertexPath) ends at {50,120} while the stored list still says {50,100}.
			const staleVertices: Point[] = [
				{ x: 50, y: 0 },
				{ x: 50, y: 100 },
			];
			const state = makeState({
				selectedConnectorId: "c1",
				objects: {
					c1: makeConnector("c1", "orthogonal", staleVertices, undefined, {
						source: { x: 0, y: 0 },
						target: { x: 100, y: 120 },
					}),
				},
			});

			const next = SetRoutingStraightCommand.execute(state, registries);
			const conn = next.objects["c1"] as ConnectorState;

			expect(conn.routing).toBe("straight");
			expect(conn.points).toEqual([
				{ x: 50, y: 0 },
				{ x: 50, y: 120 },
			]);
			expect(next.commitVersion).toBe(1);
		});

		it("a connector with no vertices keeps none (straight draws the direct line)", () => {
			const emptyPoints: Point[] = [];
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1: makeConnector("c1", "orthogonal", emptyPoints) },
			});

			const next = SetRoutingStraightCommand.execute(state, registries);
			const conn = next.objects["c1"] as ConnectorState;

			expect(conn.routing).toBe("straight");
			// the engine-routed corners are not baked either — empty stays empty
			expect(conn.points).toBe(emptyPoints);
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
