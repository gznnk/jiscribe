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

const connectPointEndpoint = (
	type: string,
	id: string,
	anchorId: string,
): EndpointRef =>
	({
		owner: { type, id },
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

	describe("経由点（waypoint）", () => {
		it("中間経由点をそのまま waypoints として返す", () => {
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

		it("center アンカーの輪郭調整は最初の経由点へ向く", () => {
			// rect は原点中心 100x100。経由点を真下に置くと source は下辺 (0, 50) 付近へ出る。
			const src = rectObj("r1", 0, 0, 100, 100);
			const conn = connector(
				centerEndpoint("rect", "r1"),
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

	describe("center アンカー", () => {
		it("center-free → source が rect の輪郭点に調整される", () => {
			const src = rectObj("r1", 0, 0, 100, 100);
			const conn = connector(
				centerEndpoint("rect", "r1"),
				freeEndpoint(200, 0),
				[],
				"straight",
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
				[],
				"straight",
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

	describe("routing === orthogonal", () => {
		const allOrthogonal = (pts: { x: number; y: number }[]): boolean =>
			pts.every((p, i) =>
				i === 0 ? true : p.x === pts[i - 1].x || p.y === pts[i - 1].y,
			);

		it("connectPoint 端点から水平/垂直だけの経路を生成し、waypoints に中間点を返す", () => {
			const src = rectObj("r1", 100, 100, 100, 60); // 右辺中央 = (150,100)
			const tgt = rectObj("r2", 400, 300, 100, 60); // 左辺中央 = (350,300)
			const conn = connector(
				connectPointEndpoint("rect", "r1", "rightCenter"),
				connectPointEndpoint("rect", "r2", "leftCenter"),
				[],
				"orthogonal",
			);
			const result = resolveConnectorPoints(conn, src, tgt);
			expect(result).not.toBeNull();
			const path = [result!.source, ...result!.waypoints, result!.target];
			expect(result?.source).toEqual({ x: 150, y: 100 });
			expect(result?.target).toEqual({ x: 350, y: 300 });
			expect(allOrthogonal(path)).toBe(true);
			// 直線ではなく曲がりがある（縦ずれがあるため）
			expect(result!.waypoints.length).toBeGreaterThan(0);
		});

		it("connectPoint の退出方向が図形の回転に追従する", () => {
			const conn = connector(
				connectPointEndpoint("rect", "r1", "rightCenter"),
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

			// 回転なし: 右辺なので最初の一歩は水平
			const a = firstSegment(noRot!);
			expect(a.dy).toBe(0);
			expect(a.dx).not.toBe(0);
			// 回転90°: 右辺が縦を向くので最初の一歩は垂直
			const b = firstSegment(rotated!);
			expect(b.dx).toBe(0);
			expect(b.dy).not.toBe(0);
		});

		it("図形を動かすと経路が再計算される（移動追従）", () => {
			const conn = connector(
				connectPointEndpoint("rect", "r1", "rightCenter"),
				connectPointEndpoint("rect", "r2", "leftCenter"),
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
				rectObj("r2", 400, 500, 100, 60), // target を下へ移動
			);
			expect(after?.target).not.toEqual(before?.target);
		});

		it("routing 省略時は orthogonal が既定（直交経路を生成する）", () => {
			const src = rectObj("r1", 100, 100, 100, 60); // 右辺中央 = (150,100)
			const tgt = rectObj("r2", 400, 300, 100, 60); // 左辺中央 = (350,300)
			// routing を渡さない（undefined）。
			const conn = connector(
				connectPointEndpoint("rect", "r1", "rightCenter"),
				connectPointEndpoint("rect", "r2", "leftCenter"),
			);
			const result = resolveConnectorPoints(conn, src, tgt);
			expect(result).not.toBeNull();
			const path = [result!.source, ...result!.waypoints, result!.target];
			expect(allOrthogonal(path)).toBe(true);
			// 縦ずれがあるため曲がり（中間点）が生まれる = 直線ではない。
			expect(result!.waypoints.length).toBeGreaterThan(0);
		});
	});
});
