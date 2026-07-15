import { describe, expect, it } from "vitest";

import { defaultRoutingForAnchors } from "../ConnectorRouting";
import type { AnchorSpec } from "../EndpointRef";

const center: AnchorSpec = { kind: "center" };
const edge: AnchorSpec = { kind: "connectPoint", id: "rightCenter" };
const free: AnchorSpec = { kind: "free", point: { x: 0, y: 0 } };

describe("defaultRoutingForAnchors", () => {
	it("returns straight when either endpoint is a center anchor", () => {
		expect(defaultRoutingForAnchors(center, center)).toBe("straight");
		expect(defaultRoutingForAnchors(center, edge)).toBe("straight");
		expect(defaultRoutingForAnchors(edge, center)).toBe("straight");
		// A center source dragging out to a free point still prefers straight.
		expect(defaultRoutingForAnchors(center, free)).toBe("straight");
	});

	it("returns undefined (orthogonal default) when both endpoints have a direction", () => {
		expect(defaultRoutingForAnchors(edge, edge)).toBeUndefined();
		// A connectPoint dragging out to a free point keeps its exit direction.
		expect(defaultRoutingForAnchors(edge, free)).toBeUndefined();
	});
});
