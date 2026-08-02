import type { Point } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import type { ConnectorState } from "../../../../../states/objects/connections/connector/ConnectorState";
import {
	getConnectorSegmentEnds,
	translateConnectorSegment,
} from "../translateConnectorSegment";

/** An owned endpoint. Its coordinate comes from the shape, so it is not the connector's to move. */
const owned = (ownerId: string) => ({
	owner: { id: ownerId },
	anchor: { kind: "connectPoint", id: "rightCenter" },
});

/** A free endpoint, carrying its coordinate itself. */
const free = (point: Point) => ({ anchor: { kind: "free", point } });

const makeConnector = (
	points: Point[],
	source: ReturnType<typeof owned> | ReturnType<typeof free>,
	target: ReturnType<typeof owned> | ReturnType<typeof free>,
): ConnectorState =>
	({
		id: "c1",
		type: "connector",
		routing: "straight",
		points,
		source,
		target,
	}) as unknown as ConnectorState;

/** Source owned, target owned, two vertices: only the middle segment (index 1) can move. */
const bothOwned = () =>
	makeConnector(
		[
			{ x: 10, y: 10 },
			{ x: 40, y: 10 },
		],
		owned("a"),
		owned("b"),
	);

/** Source owned, target free, one vertex: only the segment next to the target (index 1) can move. */
const freeTarget = () =>
	makeConnector([{ x: 10, y: 10 }], owned("a"), free({ x: 40, y: 40 }));

describe("getConnectorSegmentEnds", () => {
	it("reads a vertex-to-vertex segment's two ends", () => {
		expect(getConnectorSegmentEnds(bothOwned(), 1)).toEqual({
			start: { x: 10, y: 10 },
			end: { x: 40, y: 10 },
		});
	});

	it("reads a free endpoint as the end it is", () => {
		expect(getConnectorSegmentEnds(freeTarget(), 1)).toEqual({
			start: { x: 10, y: 10 },
			end: { x: 40, y: 40 },
		});
	});

	it("returns null for a segment with an owned end", () => {
		expect(getConnectorSegmentEnds(bothOwned(), 0)).toBeNull();
		expect(getConnectorSegmentEnds(bothOwned(), 2)).toBeNull();
	});

	it("returns null for an index off the path", () => {
		expect(getConnectorSegmentEnds(bothOwned(), 3)).toBeNull();
		expect(getConnectorSegmentEnds(bothOwned(), -1)).toBeNull();
	});
});

describe("translateConnectorSegment", () => {
	it("moves both vertices of a middle segment and leaves the endpoints alone", () => {
		const connector = bothOwned();
		const result = translateConnectorSegment(connector, 1, { x: 5, y: -7 });

		expect(result?.points).toEqual([
			{ x: 15, y: 3 },
			{ x: 45, y: 3 },
		]);
		expect(result?.source).toBe(connector.source);
		expect(result?.target).toBe(connector.target);
	});

	it("moves a free endpoint together with the vertex beside it", () => {
		const result = translateConnectorSegment(freeTarget(), 1, { x: 5, y: 5 });

		expect(result?.points).toEqual([{ x: 15, y: 15 }]);
		expect(result?.target).toEqual({
			anchor: { kind: "free", point: { x: 45, y: 45 } },
		});
	});

	it("keeps the moved endpoint free rather than carrying an owner over", () => {
		const result = translateConnectorSegment(freeTarget(), 1, { x: 1, y: 1 });

		expect(result?.target).not.toHaveProperty("owner");
	});

	it("leaves the vertices outside the segment where they are", () => {
		const connector = makeConnector(
			[
				{ x: 0, y: 0 },
				{ x: 10, y: 10 },
				{ x: 20, y: 20 },
				{ x: 30, y: 30 },
			],
			owned("a"),
			owned("b"),
		);
		const result = translateConnectorSegment(connector, 2, { x: 100, y: 0 });

		expect(result?.points).toEqual([
			{ x: 0, y: 0 },
			{ x: 110, y: 10 },
			{ x: 120, y: 20 },
			{ x: 30, y: 30 },
		]);
	});

	it("rounds the moved coordinates to the stored precision", () => {
		const result = translateConnectorSegment(bothOwned(), 1, {
			x: 0.123456789,
			y: 0,
		});

		expect(result?.points[0].x).toBe(10.1235);
	});

	it("returns null for a segment it cannot move", () => {
		expect(
			translateConnectorSegment(bothOwned(), 0, { x: 5, y: 5 }),
		).toBeNull();
	});
});
