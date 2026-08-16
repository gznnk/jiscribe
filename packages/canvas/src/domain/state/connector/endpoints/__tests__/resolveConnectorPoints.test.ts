import { describe, it, expect } from "vitest";

import type { EndpointRef } from "../../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../../states/objects/connections/connector/ConnectorState";
import { resolveConnectorPoints } from "../resolveConnectorPoints";

const freeEndpoint = (x: number, y: number): EndpointRef =>
	({ anchor: { kind: "free", point: { x, y } } }) as EndpointRef;

const centerEndpoint = (id: string): EndpointRef =>
	({ owner: { id }, anchor: { kind: "center" } }) as EndpointRef;

const connectPointEndpoint = (id: string, anchorId: string): EndpointRef =>
	({
		owner: { id },
		anchor: { kind: "connectPoint", id: anchorId },
	}) as EndpointRef;

const connector = (
	source: EndpointRef,
	target: EndpointRef,
	points: { x: number; y: number }[] = [],
	routing?: "straight" | "orthogonal",
): ConnectorState =>
	({ source, target, points, routing }) as unknown as ConnectorState;

const rectObj = (
	id: string,
	cx: number,
	cy: number,
	width: number,
	height: number,
): ObjectState =>
	({
		id,
		type: "rect",
		features: { type: "rect", geometry: "rect" },
		cx,
		cy,
		width,
		height,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

describe("resolveConnectorPoints", () => {
	describe("free-free connector", () => {
		it("both ends free → returns coordinates as-is", () => {
			const conn = connector(
				freeEndpoint(10, 20),
				freeEndpoint(50, 80),
				[],
				"straight",
			);
			const result = resolveConnectorPoints(conn, null, null);
			expect(result).not.toBeNull();
			expect(result?.source).toEqual({ x: 10, y: 20 });
			expect(result?.target).toEqual({ x: 50, y: 80 });
			expect(result?.waypoints).toEqual([]);
		});
	});

	describe("waypoints", () => {
		it("returns intermediate waypoints as-is", () => {
			const conn = connector(
				freeEndpoint(0, 0),
				freeEndpoint(100, 0),
				[
					{ x: 40, y: 60 },
					{ x: 70, y: 60 },
				],
				"straight",
			);
			const result = resolveConnectorPoints(conn, null, null);
			expect(result?.waypoints).toEqual([
				{ x: 40, y: 60 },
				{ x: 70, y: 60 },
			]);
		});

		it("center anchor outline adjustment faces the first waypoint", () => {
			// rect is 100x100 centered at the origin. Placing a waypoint directly below makes source emerge near the bottom edge (0, 50).
			const src = rectObj("r1", 0, 0, 100, 100);
			const conn = connector(
				centerEndpoint("r1"),
				freeEndpoint(300, 0),
				[{ x: 0, y: 300 }],
				"straight",
			);
			const result = resolveConnectorPoints(conn, src, null);
			expect(result).not.toBeNull();
			expect(result?.source.x).toBeCloseTo(0, 0);
			expect(result?.source.y).toBeCloseTo(50, 0);
		});
	});

	describe("center anchor", () => {
		it("center-free → source is adjusted to the rect's outline point", () => {
			const src = rectObj("r1", 0, 0, 100, 100);
			const conn = connector(
				centerEndpoint("r1"),
				freeEndpoint(200, 0),
				[],
				"straight",
			);
			const result = resolveConnectorPoints(conn, src, null);
			expect(result).not.toBeNull();
			// source is near the rightward outline point (50, 0)
			expect(result?.source.x).toBeCloseTo(50, 0);
			expect(result?.source.y).toBeCloseTo(0, 0);
		});

		it("free-center → target is adjusted to the rect's outline point", () => {
			const tgt = rectObj("r2", 0, 0, 100, 100);
			const conn = connector(
				freeEndpoint(-200, 0),
				centerEndpoint("r2"),
				[],
				"straight",
			);
			const result = resolveConnectorPoints(conn, null, tgt);
			expect(result).not.toBeNull();
			// target is near the leftward outline point (-50, 0)
			expect(result?.target.x).toBeCloseTo(-50, 0);
		});
	});

	describe("unresolvable cases", () => {
		it("center anchor with null owner object → source cannot be resolved, so null", () => {
			const conn = connector(centerEndpoint("r1"), freeEndpoint(100, 0));
			const result = resolveConnectorPoints(conn, null, null);
			// center anchor with null obj → resolveEndpoint returns null → null
			expect(result).toBeNull();
		});

		it("both ends center and mutually interior → adjustToOutline returns null → null", () => {
			// center to center of the same rect (within shape) → both ends may become null
			const src = rectObj("r1", 0, 0, 200, 200);
			const conn = connector(centerEndpoint("r1"), centerEndpoint("r1"));
			// the direction from center to center makes adjustToOutline return null
			const result = resolveConnectorPoints(conn, src, src);
			expect(result).toBeNull();
		});
	});

	describe("routing === orthogonal", () => {
		const allOrthogonal = (pts: { x: number; y: number }[]): boolean =>
			pts.every((p, i) =>
				i === 0 ? true : p.x === pts[i - 1].x || p.y === pts[i - 1].y,
			);

		it("generates a route using only horizontal/vertical segments from connectPoint endpoints and returns intermediate points as waypoints", () => {
			const src = rectObj("r1", 100, 100, 100, 60); // right-edge center = (150,100)
			const tgt = rectObj("r2", 400, 300, 100, 60); // left-edge center = (350,300)
			const conn = connector(
				connectPointEndpoint("r1", "rightCenter"),
				connectPointEndpoint("r2", "leftCenter"),
				[],
				"orthogonal",
			);
			const result = resolveConnectorPoints(conn, src, tgt);
			expect(result).not.toBeNull();
			const path = [result!.source, ...result!.waypoints, result!.target];
			expect(result?.source).toEqual({ x: 150, y: 100 });
			expect(result?.target).toEqual({ x: 350, y: 300 });
			expect(allOrthogonal(path)).toBe(true);
			// there is a bend rather than a straight line (because of the vertical offset)
			expect(result!.waypoints.length).toBeGreaterThan(0);
		});

		it("the connectPoint exit direction follows the shape's rotation", () => {
			const conn = connector(
				connectPointEndpoint("r1", "rightCenter"),
				freeEndpoint(400, 400),
				[],
				"orthogonal",
			);
			const firstSegment = (
				r: NonNullable<ReturnType<typeof resolveConnectorPoints>>,
			) => {
				const p1 = r.waypoints[0] ?? r.target;
				return { dx: p1.x - r.source.x, dy: p1.y - r.source.y };
			};

			const noRot = resolveConnectorPoints(
				conn,
				rectObj("r1", 100, 100, 100, 60),
				null,
			);
			const rotated = resolveConnectorPoints(
				conn,
				{ ...rectObj("r1", 100, 100, 100, 60), rotation: 90 } as ObjectState,
				null,
			);

			// no rotation: right edge, so the first step is horizontal
			const a = firstSegment(noRot!);
			expect(a.dy).toBe(0);
			expect(a.dx).not.toBe(0);
			// 90° rotation: the right edge faces vertically, so the first step is vertical
			const b = firstSegment(rotated!);
			expect(b.dx).toBe(0);
			expect(b.dy).not.toBe(0);
		});

		it("moving a shape recalculates the route (follows movement)", () => {
			const conn = connector(
				connectPointEndpoint("r1", "rightCenter"),
				connectPointEndpoint("r2", "leftCenter"),
				[],
				"orthogonal",
			);
			const before = resolveConnectorPoints(
				conn,
				rectObj("r1", 100, 100, 100, 60),
				rectObj("r2", 400, 300, 100, 60),
			);
			const after = resolveConnectorPoints(
				conn,
				rectObj("r1", 100, 100, 100, 60),
				rectObj("r2", 400, 500, 100, 60), // move target downward
			);
			expect(after?.target).not.toEqual(before?.target);
		});

		it("orthogonal is the default when routing is omitted (generates an orthogonal route)", () => {
			const src = rectObj("r1", 100, 100, 100, 60); // right-edge center = (150,100)
			const tgt = rectObj("r2", 400, 300, 100, 60); // left-edge center = (350,300)
			// routing is not passed (undefined).
			const conn = connector(
				connectPointEndpoint("r1", "rightCenter"),
				connectPointEndpoint("r2", "leftCenter"),
			);
			const result = resolveConnectorPoints(conn, src, tgt);
			expect(result).not.toBeNull();
			const path = [result!.source, ...result!.waypoints, result!.target];
			expect(allOrthogonal(path)).toBe(true);
			// the vertical offset produces a bend (intermediate point) = not a straight line.
			expect(result!.waypoints.length).toBeGreaterThan(0);
		});
	});
});
