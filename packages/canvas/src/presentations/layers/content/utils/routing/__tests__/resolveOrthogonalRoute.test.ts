import type { Point } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import type { AnchorSpec } from "../../../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import { resolveOrthogonalRoute } from "../resolveOrthogonalRoute";

/** isTransformedFrame を満たす無回転の Frame 系 state。 */
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

/** 各セグメントが水平 or 垂直（軸並行）であることを検証する。 */
const expectOrthogonal = (path: Point[]): void => {
	for (let i = 1; i < path.length; i++) {
		const horizontal = path[i].y === path[i - 1].y;
		const vertical = path[i].x === path[i - 1].x;
		expect(horizontal || vertical).toBe(true);
	}
};

describe("resolveOrthogonalRoute", () => {
	it("free 端点同士でも端点を結ぶ直交フルパスを返す", () => {
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

	it("connectPoint 端点は図形の外向き法線（中心→端点）方向へスタブを出す", () => {
		// source: cx=100 の右辺中央(150,100) → 外向き right
		// target: cx=400 の左辺中央(350,100) → 外向き left
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
		// 最初のセグメントは図形面から外（右）へ押し出される
		expect(path[1].x).toBeGreaterThan(sourcePoint.x);
		// 最後のセグメントは target 面へ左から接近する
		expect(path.at(-2)!.x).toBeLessThan(targetPoint.x);
	});

	it("connectPoint の外向き方向は中心→端点で決まり、図形の回転に追従する", () => {
		// 回転した図形でも、解決済み端点が中心の上にあれば外向きは up になる。
		// anchor.id は固定マップに使われないことを示すため無関係な値を渡す。
		const rotated = frameObj("r1", 100, 100, 100, 60, 90);
		const sourcePoint: Point = { x: 100, y: 40 }; // 中心(100,100)の上
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
		// 端点が中心の上にあるため、スタブは上（-y）へ出る
		expect(path[1].y).toBeLessThan(sourcePoint.y);
	});

	it("center 端点は法線を使わず、相手端点へ向かう方向にフォールバックする", () => {
		// center は connectPoint 分岐に入らないため、外向きは「相手端点へ向かう向き」。
		const sourceObj = frameObj("r1", 0, 0, 100, 60);
		const sourcePoint: Point = { x: 50, y: 0 }; // 右辺上（アウトライン調整済み想定）
		const targetPoint: Point = { x: 300, y: 0 }; // 右方向

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
		// 相手（右）へ向かうので最初のスタブは右へ
		expect(path[1].x).toBeGreaterThan(sourcePoint.x);
	});

	it("両端が同一図形なら自己ループ専用ルートで回り込むパスを返す", () => {
		const obj = frameObj("r1", 100, 100, 100, 60);
		const sourcePoint: Point = { x: 100, y: 70 }; // 上辺中央
		const targetPoint: Point = { x: 150, y: 100 }; // 右辺中央

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
		// 同一図形を回り込むため、直結ではなく中間の曲がり点を持つ
		expect(path.length).toBeGreaterThan(2);
	});

	it("同一 id でも box が無い（free 端点）場合は自己ループにせず通常ルートを使う", () => {
		// free 端点は box=null。自己ループ分岐は box 必須なので通常ルータへ。
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

		// 端点が一致 → 退化したパス（畳まれて単一点 or 2点）
		expect(path[0]).toEqual(sourcePoint);
		expect(path.at(-1)).toEqual(targetPoint);
	});
});
