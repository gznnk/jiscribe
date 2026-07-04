import { describe, it, expect } from "vitest";

import type { EndpointRef } from "../../../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
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

		it("returns null for an invalid anchorId", () => {
			const obj = rectObj(100, 100);
			expect(
				resolveEndpoint(connectPointEndpoint("invalidPoint"), obj),
			).toBeNull();
		});
	});
});
