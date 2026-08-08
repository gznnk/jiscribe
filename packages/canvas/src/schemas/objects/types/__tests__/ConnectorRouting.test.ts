import { describe, expect, it } from "vitest";

import { defaultRoutingForAnchors } from "../ConnectorRouting";
import type { AnchorSpec } from "../EndpointRef";

const center: AnchorSpec = { kind: "center" };
const edge: AnchorSpec = { kind: "connectPoint", id: "rightCenter" };
const free: AnchorSpec = { kind: "free", point: { x: 0, y: 0 } };
const edgeRatio: AnchorSpec = { kind: "edge", side: "right", t: 0.2 };

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
		// An edge anchor exits along its side's normal, so it routes like a connectPoint.
		expect(defaultRoutingForAnchors(edgeRatio, edgeRatio)).toBeUndefined();
		expect(defaultRoutingForAnchors(edgeRatio, edge)).toBeUndefined();
		expect(defaultRoutingForAnchors(edgeRatio, free)).toBeUndefined();
	});

	it("still prefers straight when an edge anchor meets a center", () => {
		expect(defaultRoutingForAnchors(edgeRatio, center)).toBe("straight");
	});
});
