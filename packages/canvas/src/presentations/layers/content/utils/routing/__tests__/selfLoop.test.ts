import {
	calcFrameBoxFeatures,
	type BoxFeatures,
	type Point,
} from "@workspace/geometry";
import { describe, it, expect } from "vitest";

import { routeSelfLoop } from "../selfLoop";
import type { OrthogonalConnectorEndpoint } from "../types";

/** 中心 (100,100)・幅100・高60 の軸並行 box（left50 right150 top70 bottom130）。 */
const box: BoxFeatures = calcFrameBoxFeatures({
	cx: 100,
	cy: 100,
	width: 100,
	height: 60,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
});

// 辺中央の connectPoint 端点（点・外向き方向は呼び出し側で解決済みの想定）。
const endpoints: Record<string, OrthogonalConnectorEndpoint> = {
	right: { point: { x: 150, y: 100 }, direction: "right", box },
	bottom: { point: { x: 100, y: 130 }, direction: "down", box },
	left: { point: { x: 50, y: 100 }, direction: "left", box },
	top: { point: { x: 100, y: 70 }, direction: "up", box },
};

const allSegmentsOrthogonal = (points: Point[]): boolean =>
	points.every((p, i) =>
		i === 0 ? true : p.x === points[i - 1].x || p.y === points[i - 1].y,
	);

/** box の内部（辺含まず）に入っている点があれば true。ループは図形を貫通しない想定。 */
const anyPointStrictlyInsideBox = (points: Point[]): boolean =>
	points.some(
		(p) =>
			p.x > box.left && p.x < box.right && p.y > box.top && p.y < box.bottom,
	);

describe("routeSelfLoop", () => {
	it("隣り合う辺（右→下）は端点を含み全セグメントが直交する", () => {
		const path = routeSelfLoop(endpoints.right, endpoints.bottom);
		expect(path[0]).toEqual({ x: 150, y: 100 });
		expect(path[path.length - 1]).toEqual({ x: 100, y: 130 });
		expect(allSegmentsOrthogonal(path)).toBe(true);
	});

	it("隣り合う辺（右→下）は共有の角（右下）を回るループになる", () => {
		const path = routeSelfLoop(endpoints.right, endpoints.bottom, {
			margin: 20,
		});
		// 右辺の外（x=170）と下辺の外（y=150）まで膨らみ、右下角 (170,150) を通る。
		expect(path).toContainEqual({ x: 170, y: 150 });
		expect(anyPointStrictlyInsideBox(path)).toBe(false);
	});

	it("向かい合う辺（右→左）は図形の片側を回り込む", () => {
		const path = routeSelfLoop(endpoints.right, endpoints.left, { margin: 20 });
		expect(path[0]).toEqual({ x: 150, y: 100 });
		expect(path[path.length - 1]).toEqual({ x: 50, y: 100 });
		expect(allSegmentsOrthogonal(path)).toBe(true);
		expect(anyPointStrictlyInsideBox(path)).toBe(false);
		// 上下どちらかの辺の外まで回り込む（角を 2 つ通る）。
		const wrapsBelow = path.some((p) => p.y === 150);
		const wrapsAbove = path.some((p) => p.y === 50);
		expect(wrapsBelow || wrapsAbove).toBe(true);
	});

	it("上→右でも図形を貫通せず端点に接続する", () => {
		const path = routeSelfLoop(endpoints.top, endpoints.right, { margin: 20 });
		expect(path[0]).toEqual({ x: 100, y: 70 });
		expect(path[path.length - 1]).toEqual({ x: 150, y: 100 });
		expect(allSegmentsOrthogonal(path)).toBe(true);
		expect(anyPointStrictlyInsideBox(path)).toBe(false);
		// 右上角 (170,50) を回る。
		expect(path).toContainEqual({ x: 170, y: 50 });
	});

	it("box が無い端点同士は退化を避けて直結で返す", () => {
		const free: OrthogonalConnectorEndpoint = {
			point: { x: 0, y: 0 },
			direction: "right",
			box: null,
		};
		const other: OrthogonalConnectorEndpoint = {
			point: { x: 10, y: 10 },
			direction: "left",
			box: null,
		};
		const path = routeSelfLoop(free, other);
		expect(path).toEqual([
			{ x: 0, y: 0 },
			{ x: 10, y: 10 },
		]);
	});
});
