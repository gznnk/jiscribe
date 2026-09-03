import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../states/objects/connector/ConnectorState";
import type { PolylineState } from "../../../../states/objects/primitives/polyline/PolylineState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { SwapArrowsCommand } from "../SwapArrowsCommand";

const registries = createTestRegistries();

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
	describe("when a connector is selected", () => {
		it("swaps the start/end arrows", () => {
			const state = makeState({
				selectedIds: [],
				selectedConnectorId: "c1",
				objects: { c1: makeConnector("c1", "Triangle", "None") },
			});
			const next = SwapArrowsCommand.execute(state, registries);
			const conn = next.objects["c1"] as ConnectorState;
			expect(conn.startArrow).toBe("None");
			expect(conn.endArrow).toBe("Triangle");
			expect(next.commitVersion).toBe(1);
		});

		it("treats an unspecified arrow as None when swapping", () => {
			const state = makeState({
				selectedIds: [],
				selectedConnectorId: "c1",
				objects: { c1: makeConnector("c1", "Triangle", undefined) },
			});
			const conn = SwapArrowsCommand.execute(state, registries).objects[
				"c1"
			] as ConnectorState;
			expect(conn.startArrow).toBe("None");
			expect(conn.endArrow).toBe("Triangle");
		});
	});

	describe("when polylines are selected", () => {
		it("swaps the arrows for each selected polyline", () => {
			const state = makeState({
				selectedIds: ["p1"],
				objects: { p1: makePolyline("p1", "Triangle", "None") },
			});
			const poly = SwapArrowsCommand.execute(state, registries).objects[
				"p1"
			] as PolylineState;
			expect(poly.startArrow).toBe("None");
			expect(poly.endArrow).toBe("Triangle");
		});

		it("swaps only the applicable targets even when non-polylines are mixed in", () => {
			const state = makeState({
				selectedIds: ["p1", "r1"],
				objects: {
					p1: makePolyline("p1", "Triangle", "None"),
					r1: makeRect("r1"),
				},
			});
			const next = SwapArrowsCommand.execute(state, registries);
			const poly = next.objects["p1"] as PolylineState;
			expect(poly.startArrow).toBe("None");
			expect(poly.endArrow).toBe("Triangle");
			// the rect is unchanged (same reference)
			expect(next.objects["r1"]).toBe(state.objects["r1"]);
		});

		it("returns the state unchanged when there are no target polylines", () => {
			const state = makeState({
				selectedIds: ["r1"],
				objects: { r1: makeRect("r1") },
			});
			expect(SwapArrowsCommand.execute(state, registries)).toBe(state);
		});
	});

	describe("canExecute", () => {
		it("is executable when a connector is selected", () => {
			const state = makeState({
				selectedIds: [],
				selectedConnectorId: "c1",
				objects: { c1: makeConnector("c1", "None", "None") },
			});
			expect(SwapArrowsCommand.canExecute(state, registries)).toBe(true);
		});

		it("is executable when the selection contains a polyline", () => {
			const state = makeState({
				selectedIds: ["p1"],
				objects: { p1: makePolyline("p1", "None", "None") },
			});
			expect(SwapArrowsCommand.canExecute(state, registries)).toBe(true);
		});

		it("is not executable when the selection has no arrow-bearing objects", () => {
			const state = makeState({
				selectedIds: ["r1"],
				objects: { r1: makeRect("r1") },
			});
			expect(SwapArrowsCommand.canExecute(state, registries)).toBe(false);
		});
	});
});
