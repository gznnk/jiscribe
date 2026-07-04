import type { Point } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import type { EndpointRef } from "../../../../../../../schemas/objects/types/EndpointRef";
import type { ConnectorState } from "../../../../../../../states/objects/connections/connector/ConnectorState";
import { isSameConnectorEndpoints } from "../isSameConnectorEndpoints";

const free = (x: number, y: number): EndpointRef => ({
	anchor: { kind: "free", point: { x, y } },
});

const owned = (id: string): EndpointRef => ({
	owner: { id },
	anchor: { kind: "connectPoint", id: "topCenter" },
});

const connector = (
	source: EndpointRef,
	target: EndpointRef,
	points: Point[] = [],
): ConnectorState =>
	({
		id: "c1",
		type: "connector",
		points,
		source,
		target,
	}) as unknown as ConnectorState;

describe("isSameConnectorEndpoints", () => {
	it("true when source/target/points are all equal", () => {
		const a = connector(free(0, 0), free(10, 10), [{ x: 5, y: 5 }]);
		const b = connector(free(0, 0), free(10, 10), [{ x: 5, y: 5 }]);
		expect(isSameConnectorEndpoints(a, b)).toBe(true);
	});

	it("false when the source free coordinates differ", () => {
		const a = connector(free(0, 0), free(10, 10));
		const b = connector(free(1, 0), free(10, 10));
		expect(isSameConnectorEndpoints(a, b)).toBe(false);
	});

	it("false when the target free coordinates differ", () => {
		const a = connector(free(0, 0), free(10, 10));
		const b = connector(free(0, 0), free(10, 11));
		expect(isSameConnectorEndpoints(a, b)).toBe(false);
	});

	it("false when the owner (connected object) differs", () => {
		const a = connector(owned("rect-1"), free(10, 10));
		const b = connector(owned("rect-2"), free(10, 10));
		expect(isSameConnectorEndpoints(a, b)).toBe(false);
	});

	it("false when the number of points differs", () => {
		const a = connector(free(0, 0), free(10, 10), [{ x: 5, y: 5 }]);
		const b = connector(free(0, 0), free(10, 10), []);
		expect(isSameConnectorEndpoints(a, b)).toBe(false);
	});

	it("false when the point coordinates differ", () => {
		const a = connector(free(0, 0), free(10, 10), [{ x: 5, y: 5 }]);
		const b = connector(free(0, 0), free(10, 10), [{ x: 6, y: 5 }]);
		expect(isSameConnectorEndpoints(a, b)).toBe(false);
	});
});
