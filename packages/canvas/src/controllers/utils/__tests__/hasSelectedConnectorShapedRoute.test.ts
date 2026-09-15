import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
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
		expect(hasSelectedConnectorShapedRoute(null, {})).toBe(false);
	});

	it("selected ID is not a connector -> false", () => {
		const rect = { id: "r", type: "rect" } as unknown as ObjectState;
		expect(hasSelectedConnectorShapedRoute("r", { r: rect })).toBe(false);
	});

	it("the route carries no vertices -> false (the engine routes it)", () => {
		expect(
			hasSelectedConnectorShapedRoute("c", { c: connector("c", []) }),
		).toBe(false);
	});

	it("the route carries a vertex -> true (shaped by hand)", () => {
		expect(
			hasSelectedConnectorShapedRoute("c", {
				c: connector("c", [{ x: 10, y: 20 }]),
			}),
		).toBe(true);
	});
});
