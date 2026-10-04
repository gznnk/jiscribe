import type { Point } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import type { ConnectorState } from "../../../../states/objects/connector/ConnectorState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { vertexPartSelection } from "../../../selection/__tests__/support/vertexPartSelection";
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
	selectedIds: string[];
	objects: Record<string, ConnectorState>;
	objectPartSelection?: CanvasControllerState["objectPartSelection"];
}): CanvasControllerState =>
	({
		commitVersion: 0,
		objectPartSelection: null,
		...params,
	}) as unknown as CanvasControllerState;

describe("ResetConnectorRouteCommand", () => {
	it("drops the vertices of the selected connector", () => {
		const state = makeState({
			selectedIds: ["c1"],
			objects: {
				c1: makeConnector("c1", [
					{ x: 10, y: 20 },
					{ x: 10, y: 40 },
				]),
			},
			objectPartSelection: vertexPartSelection("c1", 0),
		});

		const next = ResetConnectorRouteCommand.execute(state, registries);
		const conn = next.objects["c1"] as ConnectorState;

		expect(conn.points).toEqual([]);
		expect(next.objectPartSelection).toBeNull();
		expect(next.commitVersion).toBe(1);
	});

	it("is unavailable for a connector the engine already routes", () => {
		const state = makeState({
			selectedIds: ["c1"],
			objects: { c1: makeConnector("c1", []) },
		});

		expect(ResetConnectorRouteCommand.canExecute?.(state, registries)).toBe(
			false,
		);
		expect(ResetConnectorRouteCommand.execute(state, registries)).toBe(state);
	});

	it("is unavailable when no connector is selected", () => {
		const state = makeState({ selectedIds: [], objects: {} });

		expect(ResetConnectorRouteCommand.canExecute?.(state, registries)).toBe(
			false,
		);
	});
});
