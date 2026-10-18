import { describe, expect, it } from "vitest";

import { isConnectorState } from "../ConnectorState";

const freeRef = { anchor: { kind: "free", point: { x: 0, y: 0 } } };

// Exported for plugins that rewrite the ends attached to their own shape, which
// pick the connectors out of every object on the canvas with it.
describe("isConnectorState", () => {
	it("picks out a connector by its type and its two ends", () => {
		expect(
			isConnectorState({
				id: "c1",
				type: "connector",
				source: freeRef,
				target: freeRef,
			}),
		).toBe(true);
	});

	it("passes over any other object, a connector missing an end, and a non-object", () => {
		expect(isConnectorState({ id: "r1", type: "rect", x: 0, y: 0 })).toBe(
			false,
		);
		expect(
			isConnectorState({ id: "c1", type: "connector", source: freeRef }),
		).toBe(false);
		expect(isConnectorState(null)).toBe(false);
		expect(isConnectorState("connector")).toBe(false);
	});
});
