import { beforeAll, describe, it, expect } from "vitest";

import { initializeObjectRegistry } from "../../../../../controllers/setup/initializeObjectRegistry";
import type { EndpointRef } from "../../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../../states/objects/connections/connector/ConnectorState";
import { resolveConnectorPoints } from "../resolveConnectorPoints";

beforeAll(() => {
	initializeObjectRegistry();
});

const freeEndpoint = (x: number, y: number): EndpointRef =>
	({ anchor: { kind: "free", point: { x, y } } }) as EndpointRef;

const centerEndpoint = (type: string, id: string): EndpointRef =>
	({ owner: { type, id }, anchor: { kind: "center" } }) as EndpointRef;

const connector = (source: EndpointRef, target: EndpointRef): ConnectorState =>
	({ source, target }) as unknown as ConnectorState;

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
		cx,
		cy,
		width,
		height,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

describe("resolveConnectorPoints", () => {
	describe("free-free コネクター", () => {
		it("両端 free → そのまま座標を返す", () => {
			const conn = connector(freeEndpoint(10, 20), freeEndpoint(50, 80));
			const result = resolveConnectorPoints(conn, null, null);
			expect(result).not.toBeNull();
			expect(result?.source).toEqual({ x: 10, y: 20 });
			expect(result?.target).toEqual({ x: 50, y: 80 });
		});
	});

	describe("center アンカー", () => {
		it("center-free → source が rect の輪郭点に調整される", () => {
			const src = rectObj("r1", 0, 0, 100, 100);
			const conn = connector(
				centerEndpoint("rect", "r1"),
				freeEndpoint(200, 0),
			);
			const result = resolveConnectorPoints(conn, src, null);
			expect(result).not.toBeNull();
			// source は右方向の輪郭点 (50, 0) 付近
			expect(result?.source.x).toBeCloseTo(50, 0);
			expect(result?.source.y).toBeCloseTo(0, 0);
		});

		it("free-center → target が rect の輪郭点に調整される", () => {
			const tgt = rectObj("r2", 0, 0, 100, 100);
			const conn = connector(
				freeEndpoint(-200, 0),
				centerEndpoint("rect", "r2"),
			);
			const result = resolveConnectorPoints(conn, null, tgt);
			expect(result).not.toBeNull();
			// target は左方向の輪郭点 (-50, 0) 付近
			expect(result?.target.x).toBeCloseTo(-50, 0);
		});
	});

	describe("解決不能ケース", () => {
		it("center アンカーで owner オブジェクトが null → source が解決できず null", () => {
			const conn = connector(
				centerEndpoint("rect", "r1"),
				freeEndpoint(100, 0),
			);
			const result = resolveConnectorPoints(conn, null, null);
			// center アンカーで obj が null → resolveEndpoint が null を返す → null
			expect(result).toBeNull();
		});

		it("両端が center かつ互いに内側 → adjustToOutline が null を返す → null", () => {
			// 同じ rect の中心同士（within shape）→ 両端とも null になる可能性
			const src = rectObj("r1", 0, 0, 200, 200);
			const conn = connector(
				centerEndpoint("rect", "r1"),
				centerEndpoint("rect", "r1"),
			);
			// 中心から中心への方向なので adjustToOutline が null を返す
			const result = resolveConnectorPoints(conn, src, src);
			expect(result).toBeNull();
		});
	});
});
