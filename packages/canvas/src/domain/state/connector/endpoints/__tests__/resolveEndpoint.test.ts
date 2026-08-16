import { describe, it, expect } from "vitest";

import type { EndpointRef } from "../../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { ExtraConnectPoint } from "../../../registry/ObjectExtraConnectPointsRegistry";
import { resolveEndpoint } from "../resolveEndpoint";

const freeEndpoint = (x: number, y: number): EndpointRef =>
	({ anchor: { kind: "free", point: { x, y } } }) as EndpointRef;

const centerEndpoint = (): EndpointRef =>
	({
		owner: { id: "obj-1" },
		anchor: { kind: "center" },
	}) as EndpointRef;

const connectPointEndpoint = (id: string): EndpointRef =>
	({
		owner: { id: "obj-1" },
		anchor: { kind: "connectPoint", id },
	}) as EndpointRef;

const edgeEndpoint = (
	side: "top" | "right" | "bottom" | "left",
	t: number,
): EndpointRef =>
	({
		owner: { id: "obj-1" },
		anchor: { kind: "edge", side, t },
	}) as EndpointRef;

const rectObj = (cx: number, cy: number): ObjectState =>
	({
		id: "obj-1",
		type: "rect",
		cx,
		cy,
		width: 100,
		height: 50,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

describe("resolveEndpoint", () => {
	describe("FreeAnchor", () => {
		it("returns the specified point as-is", () => {
			expect(resolveEndpoint(freeEndpoint(10, 20), null)).toEqual({
				x: 10,
				y: 20,
			});
		});

		it("returns the point even when obj is null", () => {
			expect(resolveEndpoint(freeEndpoint(5, 15), null)).toEqual({
				x: 5,
				y: 15,
			});
		});
	});

	describe("CenterAnchor", () => {
		it("returns null when obj is null", () => {
			expect(resolveEndpoint(centerEndpoint(), null)).toBeNull();
		});

		it("returns null when obj is undefined", () => {
			expect(resolveEndpoint(centerEndpoint(), undefined)).toBeNull();
		});

		it("returns { x: cx, y: cy } for an object with cx/cy", () => {
			const obj = rectObj(100, 200);
			expect(resolveEndpoint(centerEndpoint(), obj)).toEqual({
				x: 100,
				y: 200,
			});
		});
	});

	describe("ConnectPointAnchor", () => {
		it("returns null when obj is null", () => {
			expect(
				resolveEndpoint(connectPointEndpoint("topCenter"), null),
			).toBeNull();
		});

		it("returns null for an object that is not a TransformedFrame", () => {
			const nonFrame = { id: "x", type: "polyline" } as unknown as ObjectState;
			expect(
				resolveEndpoint(connectPointEndpoint("topCenter"), nonFrame),
			).toBeNull();
		});

		it("topCenter maps to (cx, cy - height/2) when rotation=0", () => {
			const obj = rectObj(100, 100);
			const result = resolveEndpoint(connectPointEndpoint("topCenter"), obj);
			expect(result).not.toBeNull();
			expect(result!.x).toBeCloseTo(100);
			expect(result!.y).toBeCloseTo(75);
		});

		it("bottomCenter maps to (cx, cy + height/2) when rotation=0", () => {
			const obj = rectObj(100, 100);
			const result = resolveEndpoint(connectPointEndpoint("bottomCenter"), obj);
			expect(result!.x).toBeCloseTo(100);
			expect(result!.y).toBeCloseTo(125);
		});

		it("leftCenter maps to (cx - width/2, cy) when rotation=0", () => {
			const obj = rectObj(100, 100);
			const result = resolveEndpoint(connectPointEndpoint("leftCenter"), obj);
			expect(result!.x).toBeCloseTo(50);
			expect(result!.y).toBeCloseTo(100);
		});

		it("rightCenter maps to (cx + width/2, cy) when rotation=0", () => {
			const obj = rectObj(100, 100);
			const result = resolveEndpoint(connectPointEndpoint("rightCenter"), obj);
			expect(result!.x).toBeCloseTo(150);
			expect(result!.y).toBeCloseTo(100);
		});

		it("falls back to the center for an id nothing declares", () => {
			const obj = rectObj(100, 100);
			expect(
				resolveEndpoint(connectPointEndpoint("invalidPoint"), obj),
			).toEqual({ x: 100, y: 100 });
		});
	});

	describe("ConnectPointAnchor on a declared extra point", () => {
		// The shape is 100x50 centered on (100, 100), so its local left edge is at
		// x = -50 and the declared point sits a quarter of the height above center.
		const leftTip: ExtraConnectPoint = {
			id: "tip",
			point: { x: -50, y: -12.5 },
			direction: { x: -1, y: 0 },
		};

		it("resolves the declared point through the frame transform", () => {
			expect(
				resolveEndpoint(
					connectPointEndpoint("tip"),
					rectObj(100, 100),
					null,
					null,
					[leftTip],
				),
			).toEqual({ x: 50, y: 87.5 });
		});

		it("carries the shape's rotation and flip", () => {
			const flipped = {
				...(rectObj(100, 100) as unknown as Record<string, unknown>),
				scaleX: -1,
			} as unknown as ObjectState;
			expect(
				resolveEndpoint(connectPointEndpoint("tip"), flipped, null, null, [
					leftTip,
				]),
			).toEqual({ x: 150, y: 87.5 });
		});

		it("falls back to the center when the id is not among the declared ones", () => {
			expect(
				resolveEndpoint(
					connectPointEndpoint("stem"),
					rectObj(100, 100),
					null,
					null,
					[leftTip],
				),
			).toEqual({ x: 100, y: 100 });
		});
	});
});

describe("EdgeAnchor", () => {
	it("resolves the ratio along the named local side", () => {
		// 100 x 50 rect centered on (200, 100): top edge y = 75, x spans 150..250.
		expect(
			resolveEndpoint(edgeEndpoint("top", 0.25), rectObj(200, 100)),
		).toEqual({ x: 175, y: 75 });
		expect(
			resolveEndpoint(edgeEndpoint("right", 0.75), rectObj(200, 100)),
		).toEqual({ x: 250, y: 112.5 });
	});

	it("resolves 0.5 to the same point as the matching edge midpoint", () => {
		const obj = rectObj(200, 100);
		expect(resolveEndpoint(edgeEndpoint("bottom", 0.5), obj)).toEqual(
			resolveEndpoint(connectPointEndpoint("bottomCenter"), obj),
		);
	});

	it("returns null when the owner is missing", () => {
		expect(resolveEndpoint(edgeEndpoint("top", 0.25), null)).toBeNull();
	});
});
