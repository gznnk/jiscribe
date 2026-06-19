import { describe, it, expect } from "vitest";

import type { EndpointRef } from "../../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import { resolveEndpoint } from "../resolveEndpoint";

const freeEndpoint = (x: number, y: number): EndpointRef =>
	({ anchor: { kind: "free", point: { x, y } } }) as EndpointRef;

const centerEndpoint = (): EndpointRef =>
	({
		owner: { type: "rect", id: "obj-1" },
		anchor: { kind: "center" },
	}) as EndpointRef;

const connectPointEndpoint = (id: string): EndpointRef =>
	({
		owner: { type: "rect", id: "obj-1" },
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
		it("指定した点をそのまま返す", () => {
			expect(resolveEndpoint(freeEndpoint(10, 20), null)).toEqual({
				x: 10,
				y: 20,
			});
		});

		it("obj が null でも点を返す", () => {
			expect(resolveEndpoint(freeEndpoint(5, 15), null)).toEqual({
				x: 5,
				y: 15,
			});
		});
	});

	describe("CenterAnchor", () => {
		it("obj が null のとき null を返す", () => {
			expect(resolveEndpoint(centerEndpoint(), null)).toBeNull();
		});

		it("obj が undefined のとき null を返す", () => {
			expect(resolveEndpoint(centerEndpoint(), undefined)).toBeNull();
		});

		it("cx/cy を持つオブジェクトのとき { x: cx, y: cy } を返す", () => {
			const obj = rectObj(100, 200);
			expect(resolveEndpoint(centerEndpoint(), obj)).toEqual({
				x: 100,
				y: 200,
			});
		});
	});

	describe("ConnectPointAnchor", () => {
		it("obj が null のとき null を返す", () => {
			expect(
				resolveEndpoint(connectPointEndpoint("topCenter"), null),
			).toBeNull();
		});

		it("TransformedFrame でないオブジェクトのとき null を返す", () => {
			const nonFrame = { id: "x", type: "polyline" } as unknown as ObjectState;
			expect(
				resolveEndpoint(connectPointEndpoint("topCenter"), nonFrame),
			).toBeNull();
		});

		it("rotation=0 のとき topCenter は (cx, cy - height/2) に対応する", () => {
			const obj = rectObj(100, 100);
			const result = resolveEndpoint(connectPointEndpoint("topCenter"), obj);
			expect(result).not.toBeNull();
			expect(result!.x).toBeCloseTo(100);
			expect(result!.y).toBeCloseTo(75);
		});

		it("rotation=0 のとき bottomCenter は (cx, cy + height/2) に対応する", () => {
			const obj = rectObj(100, 100);
			const result = resolveEndpoint(connectPointEndpoint("bottomCenter"), obj);
			expect(result!.x).toBeCloseTo(100);
			expect(result!.y).toBeCloseTo(125);
		});

		it("rotation=0 のとき leftCenter は (cx - width/2, cy) に対応する", () => {
			const obj = rectObj(100, 100);
			const result = resolveEndpoint(connectPointEndpoint("leftCenter"), obj);
			expect(result!.x).toBeCloseTo(50);
			expect(result!.y).toBeCloseTo(100);
		});

		it("rotation=0 のとき rightCenter は (cx + width/2, cy) に対応する", () => {
			const obj = rectObj(100, 100);
			const result = resolveEndpoint(connectPointEndpoint("rightCenter"), obj);
			expect(result!.x).toBeCloseTo(150);
			expect(result!.y).toBeCloseTo(100);
		});

		it("無効な anchorId のとき null を返す", () => {
			const obj = rectObj(100, 100);
			expect(
				resolveEndpoint(connectPointEndpoint("invalidPoint"), obj),
			).toBeNull();
		});
	});
});
