import type { Point } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import type { AnchorSpec } from "../../../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import { calcPathSignature } from "../pathSignature";
import { resolveOrthogonalRoute } from "../resolveOrthogonalRoute";

/** An unrotated Frame-family state that satisfies isTransformedFrame. */
const frameObj = (
	id: string,
	cx: number,
	cy: number,
	width: number,
	height: number,
	rotation = 0,
): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width,
		height,
		rotation,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

const connectPoint = (id: string): AnchorSpec =>
	({ kind: "connectPoint", id }) as AnchorSpec;
const center: AnchorSpec = { kind: "center" };
const free = (point: Point): AnchorSpec => ({ kind: "free", point });

/** Verifies that each segment is horizontal or vertical (axis-aligned). */
const expectOrthogonal = (path: Point[]): void => {
	for (let i = 1; i < path.length; i++) {
		const horizontal = path[i].y === path[i - 1].y;
		const vertical = path[i].x === path[i - 1].x;
		expect(horizontal || vertical).toBe(true);
	}
};

describe("resolveOrthogonalRoute", () => {
	it("returns a full orthogonal path connecting the endpoints even for two free endpoints", () => {
		const source: Point = { x: 0, y: 0 };
		const target: Point = { x: 100, y: 100 };

		const path = resolveOrthogonalRoute(
			free(source),
			free(target),
			source,
			target,
			null,
			null,
		);

		expect(path[0]).toEqual(source);
		expect(path.at(-1)).toEqual(target);
		expect(path.length).toBeGreaterThanOrEqual(2);
		expectOrthogonal(path);
	});

	it("connectPoint endpoints emit stubs along the shape's outward normal (center → endpoint)", () => {
		// source: right-edge center (150,100) of cx=100 → outward right
		// target: left-edge center (350,100) of cx=400 → outward left
		const sourceObj = frameObj("r1", 100, 100, 100, 60);
		const targetObj = frameObj("r2", 400, 100, 100, 60);
		const sourcePoint: Point = { x: 150, y: 100 };
		const targetPoint: Point = { x: 350, y: 100 };

		const path = resolveOrthogonalRoute(
			connectPoint("rightCenter"),
			connectPoint("leftCenter"),
			sourcePoint,
			targetPoint,
			sourceObj,
			targetObj,
		);

		expect(path[0]).toEqual(sourcePoint);
		expect(path.at(-1)).toEqual(targetPoint);
		expectOrthogonal(path);
		// the first segment is pushed out (rightward) from the shape's face
		expect(path[1].x).toBeGreaterThan(sourcePoint.x);
		// the last segment approaches the target face from the left
		expect(path.at(-2)!.x).toBeLessThan(targetPoint.x);
	});

	it("the connectPoint outward direction is determined by center → endpoint and follows the shape's rotation", () => {
		// even for a rotated shape, if the resolved endpoint is above the center, outward is up.
		// pass an unrelated anchor.id to show it is not used for a fixed mapping.
		const rotated = frameObj("r1", 100, 100, 100, 60, 90);
		const sourcePoint: Point = { x: 100, y: 40 }; // above the center (100,100)
		const targetPoint: Point = { x: 100, y: 400 };

		const path = resolveOrthogonalRoute(
			connectPoint("rightCenter"),
			free(targetPoint),
			sourcePoint,
			targetPoint,
			rotated,
			null,
		);

		expect(path[0]).toEqual(sourcePoint);
		expectOrthogonal(path);
		// since the endpoint is above the center, the stub emerges upward (-y)
		expect(path[1].y).toBeLessThan(sourcePoint.y);
	});

	it("center endpoints don't use the normal and fall back to the direction toward the other endpoint", () => {
		// center does not enter the connectPoint branch, so outward is "the direction toward the other endpoint".
		const sourceObj = frameObj("r1", 0, 0, 100, 60);
		const sourcePoint: Point = { x: 50, y: 0 }; // on the right edge (assumed outline-adjusted)
		const targetPoint: Point = { x: 300, y: 0 }; // to the right

		const path = resolveOrthogonalRoute(
			center,
			free(targetPoint),
			sourcePoint,
			targetPoint,
			sourceObj,
			null,
		);

		expect(path[0]).toEqual(sourcePoint);
		expect(path.at(-1)).toEqual(targetPoint);
		expectOrthogonal(path);
		// heading toward the other endpoint (right), so the first stub goes right
		expect(path[1].x).toBeGreaterThan(sourcePoint.x);
	});

	it("when both ends are the same shape, returns a wrap-around path via the dedicated self-loop route", () => {
		const obj = frameObj("r1", 100, 100, 100, 60);
		const sourcePoint: Point = { x: 100, y: 70 }; // top-edge center
		const targetPoint: Point = { x: 150, y: 100 }; // right-edge center

		const path = resolveOrthogonalRoute(
			connectPoint("topCenter"),
			connectPoint("rightCenter"),
			sourcePoint,
			targetPoint,
			obj,
			obj,
		);

		expect(path[0]).toEqual(sourcePoint);
		expect(path.at(-1)).toEqual(targetPoint);
		expectOrthogonal(path);
		// wrapping around the same shape, so it has intermediate bends rather than a direct connection
		expect(path.length).toBeGreaterThan(2);
	});

	it("uses the normal route instead of a self-loop when there is no box (free endpoints), even with the same id", () => {
		// free endpoints have box=null. The self-loop branch requires a box, so it goes to the normal router.
		const sourcePoint: Point = { x: 0, y: 0 };
		const targetPoint: Point = { x: 0, y: 0 };

		const path = resolveOrthogonalRoute(
			free(sourcePoint),
			free(targetPoint),
			sourcePoint,
			targetPoint,
			null,
			null,
		);

		// endpoints coincide → degenerate path (collapsed to a single point or 2 points)
		expect(path[0]).toEqual(sourcePoint);
		expect(path.at(-1)).toEqual(targetPoint);
	});

	describe("route stability under cost ties", () => {
		// Source exits right, target sits behind (to the left): the route wraps around, and for
		// equal-sized boxes the over-top vs. under-bottom wraps are exact cost ties for every
		// vertical offset. The total-order tie-breaking must keep the topology fixed while the
		// target is dragged across the source's midline.
		const routeWrapAround = (targetCy: number): Point[] =>
			resolveOrthogonalRoute(
				connectPoint("right"),
				connectPoint("left"),
				{ x: 100, y: 50 },
				{ x: -300, y: targetCy },
				frameObj("src", 50, 50, 100, 100),
				frameObj("tgt", -250, targetCy, 100, 100),
			);

		it("keeps the same topology across a monotone drag through the cost-tie window", () => {
			const signatures = new Set<string>();
			for (let targetCy = 20; targetCy <= 80; targetCy += 1) {
				signatures.add(calcPathSignature(routeWrapAround(targetCy)));
			}
			expect(signatures.size).toBe(1);
		});
	});
});
