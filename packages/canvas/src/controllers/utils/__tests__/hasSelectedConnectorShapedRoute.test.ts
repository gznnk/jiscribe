import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { selectionOf } from "../../selection/__tests__/support/selectionOf";
import { hasSelectedConnectorShapedRoute } from "../hasSelectedConnectorShapedRoute";

const connector = (
	id: string,
	points: { x: number; y: number }[],
): ObjectState =>
	({
		id,
		type: "connector",
		points,
	}) as unknown as ObjectState;

describe("hasSelectedConnectorShapedRoute", () => {
	it("no connector selected -> false", () => {
		expect(
			hasSelectedConnectorShapedRoute({
				selection: selectionOf([]),
				objects: {},
			}),
		).toBe(false);
	});

	it("selected ID is not a connector -> false", () => {
		const rect = { id: "r", type: "rect" } as unknown as ObjectState;
		expect(
			hasSelectedConnectorShapedRoute({
				selection: selectionOf(["r"]),
				objects: { r: rect },
			}),
		).toBe(false);
	});

	it("the route carries no vertices -> false (the engine routes it)", () => {
		expect(
			hasSelectedConnectorShapedRoute({
				selection: selectionOf(["c"]),
				objects: { c: connector("c", []) },
			}),
		).toBe(false);
	});

	it("the route carries a vertex -> true (shaped by hand)", () => {
		expect(
			hasSelectedConnectorShapedRoute({
				selection: selectionOf(["c"]),
				objects: { c: connector("c", [{ x: 10, y: 20 }]) },
			}),
		).toBe(true);
	});
});
