import type { Point } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { ResetConnectorRouteCommand } from "../ResetConnectorRouteCommand";

const registries = createTestRegistries();

const makeConnector = (id: string, points: Point[]): ConnectorState =>
	({
		id,
		type: "connector",
		points,
		source: { anchor: { kind: "free", point: { x: 0, y: 0 } } },
		target: { anchor: { kind: "free", point: { x: 10, y: 10 } } },
	}) as unknown as ConnectorState;

const makeState = (params: {
	selectedConnectorId: string | null;
	objects: Record<string, ConnectorState>;
	selectedVertex?: CanvasControllerState["selectedVertex"];
}): CanvasControllerState =>
	({
		selectedIds: [],
		commitVersion: 0,
		selectedVertex: null,
		...params,
	}) as unknown as CanvasControllerState;

describe("ResetConnectorRouteCommand", () => {
	it("drops the vertices of the selected connector", () => {
		const state = makeState({
			selectedConnectorId: "c1",
			objects: {
				c1: makeConnector("c1", [
					{ x: 10, y: 20 },
					{ x: 10, y: 40 },
				]),
			},
			selectedVertex: { objectId: "c1", vertexIndex: 0 },
		});

		const next = ResetConnectorRouteCommand.execute(state, registries);
		const conn = next.objects["c1"] as ConnectorState;

		expect(conn.points).toEqual([]);
		expect(next.selectedVertex).toBeNull();
		expect(next.commitVersion).toBe(1);
	});

	it("is unavailable for a connector the engine already routes", () => {
		const state = makeState({
			selectedConnectorId: "c1",
			objects: { c1: makeConnector("c1", []) },
		});

		expect(ResetConnectorRouteCommand.canExecute?.(state, registries)).toBe(
			false,
		);
		expect(ResetConnectorRouteCommand.execute(state, registries)).toBe(state);
	});

	it("is unavailable when no connector is selected", () => {
		const state = makeState({ selectedConnectorId: null, objects: {} });

		expect(ResetConnectorRouteCommand.canExecute?.(state, registries)).toBe(
			false,
		);
	});
});
