import { beforeAll, describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { initializeObjectRegistry } from "../../setup/initializeObjectRegistry";
import { collectObjectPoints } from "../collectObjectPoints";

beforeAll(() => {
	initializeObjectRegistry();
});

const rect = (
	id: string,
	cx: number,
	cy: number,
	width: number,
	height: number,
	rotation = 0,
	scaleX = 1,
	scaleY = 1,
): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width,
		height,
		rotation,
		scaleX,
		scaleY,
	}) as unknown as ObjectState;

const group = (id: string, childIds: string[]): GroupState =>
	({ id, type: "group", childIds }) as unknown as GroupState;

const poly = (
	id: string,
	points: Array<{ x: number; y: number }>,
): ObjectState => ({ id, type: "polyline", points }) as unknown as ObjectState;

const freeConnector = (
	overrides: Partial<Record<string, unknown>> = {},
): ObjectState =>
	({
		id: "connector-1",
		type: "connector",
		points: [],
		routing: "straight",
		source: { anchor: { kind: "free", point: { x: 10, y: 20 } } },
		target: { anchor: { kind: "free", point: { x: 110, y: 70 } } },
		...overrides,
	}) as unknown as ObjectState;

const sortPoints = (points: Array<{ x: number; y: number }>) =>
	points
		.map((p) => ({
			x: Math.round(p.x * 1000) / 1000,
			y: Math.round(p.y * 1000) / 1000,
		}))
		.sort((a, b) => a.x - b.x || a.y - b.y);

describe("collectObjectPoints", () => {
	it("returns the four corners of an axis-aligned rect", () => {
		const obj = rect("r", 100, 100, 100, 50);
		expect(sortPoints(collectObjectPoints(obj, { r: obj }))).toEqual([
			{ x: 50, y: 75 },
			{ x: 50, y: 125 },
			{ x: 150, y: 75 },
			{ x: 150, y: 125 },
		]);
	});

	it("returns transformed corners for a rotated rect", () => {
		// A 100x50 rect rotated 90 degrees: corners land on a 50x100 extent
		const obj = rect("r", 100, 100, 100, 50, 90);
		expect(sortPoints(collectObjectPoints(obj, { r: obj }))).toEqual([
			{ x: 75, y: 50 },
			{ x: 75, y: 150 },
			{ x: 125, y: 50 },
			{ x: 125, y: 150 },
		]);
	});

	it("passes a polyline's points through unchanged", () => {
		const points = [
			{ x: 10, y: 20 },
			{ x: 50, y: 80 },
		];
		const obj = poly("pl", points);
		expect(collectObjectPoints(obj, { pl: obj })).toEqual(points);
	});

	it("recursively collects points from group children", () => {
		const r = rect("r", 100, 100, 100, 50);
		const pl = poly("pl", [{ x: -5, y: -5 }]);
		const innerGroup = group("inner", ["pl"]);
		const outerGroup = group("outer", ["r", "inner", "missing"]);
		const objects = { r, pl, inner: innerGroup };
		const collected = collectObjectPoints(outerGroup, objects);
		expect(collected).toHaveLength(5); // 4 rect corners + 1 poly vertex
		expect(collected).toContainEqual({ x: -5, y: -5 });
	});

	it("returns resolved endpoints plus waypoints for a connector", () => {
		const connector = freeConnector({ points: [{ x: 60, y: 200 }] });
		expect(
			collectObjectPoints(connector, { "connector-1": connector }),
		).toEqual([
			{ x: 10, y: 20 },
			{ x: 60, y: 200 },
			{ x: 110, y: 70 },
		]);
	});

	it("returns an empty array for an unresolvable connector", () => {
		const connector = freeConnector({
			source: {
				owner: { type: "rect", id: "missing-rect" },
				anchor: { kind: "center" },
			},
		});
		expect(
			collectObjectPoints(connector, { "connector-1": connector }),
		).toEqual([]);
	});

	it("returns an empty array for an object of unknown shape", () => {
		const unknownObj = { id: "u", type: "mystery" } as unknown as ObjectState;
		expect(collectObjectPoints(unknownObj, { u: unknownObj })).toEqual([]);
	});
});
