import type { Point } from "@workspace/geometry";

import { simplifyPath } from "./simplifyPath";
import { DEFAULT_MARGIN, stubPoint } from "./stub";
import type {
	OrthogonalConnectorEndpoint,
	RouteOrthogonalConnectorOptions,
} from "./types";

/** 周辺パラメータ比較の許容誤差（px）。角と端点の重なり判定に使う。 */
const EPS = 1e-6;

/**
 * 同一図形の 2 辺を結ぶ自己ループの直交パスを生成する。
 *
 * 図形の AABB を `margin` だけ外側へ広げた**リング矩形**を考え、各端点をその面から
 * リング辺へ押し出した**スタブ**を作る。リング外周を「短く回る方向」に辿って両スタブを
 * 結ぶことで、図形を貫通しない矩形ループになる:
 * - 隣り合う辺 → 共有する角を 1 つ回る L 字
 * - 同じ辺（呼び出し側で別アンカーに限定される前提）→ その辺から膨らむ U 字
 * - 向かい合う辺 → 図形の片側（右回り）を回り込む
 *
 * 戻り値は端点を含むフルパス `[source.point, …, target.point]`（共線・重複は畳み済み）。
 * 両端は同一図形なので box は一致する前提（source.box を採用）。
 */
export const routeSelfLoop = (
	source: OrthogonalConnectorEndpoint,
	target: OrthogonalConnectorEndpoint,
	options: RouteOrthogonalConnectorOptions = {},
): Point[] => {
	const margin = options.margin ?? DEFAULT_MARGIN;
	const box = source.box ?? target.box;

	// box が無い（free 端点）自己ループは想定外。退化を避けて直結で返す。
	if (!box) {
		return simplifyPath([source.point, target.point]);
	}

	const sourceStub = stubPoint(source.point, source.direction, box, margin);
	const targetStub = stubPoint(target.point, target.direction, box, margin);

	// リング矩形（AABB + margin）。スタブはこの矩形の辺上に乗る。
	const ring: RingRect = {
		left: box.left - margin,
		top: box.top - margin,
		right: box.right + margin,
		bottom: box.bottom + margin,
	};
	const width = ring.right - ring.left;
	const height = ring.bottom - ring.top;
	const perimeter = 2 * width + 2 * height;

	// リング外周をスタブ間で短く回る方向に辿り、通過する角を列挙する。
	const sourceParam = perimeterParam(sourceStub, ring, width, height);
	const targetParam = perimeterParam(targetStub, ring, width, height);

	const cwCorners = arcCorners(
		sourceParam,
		targetParam,
		true,
		ring,
		width,
		height,
		perimeter,
	);
	const ccwCorners = arcCorners(
		sourceParam,
		targetParam,
		false,
		ring,
		width,
		height,
		perimeter,
	);

	const cwPath = [sourceStub, ...cwCorners, targetStub];
	const ccwPath = [sourceStub, ...ccwCorners, targetStub];
	const ringPath = pathLength(cwPath) <= pathLength(ccwPath) ? cwPath : ccwPath;

	return simplifyPath([source.point, ...ringPath, target.point]);
};

type RingRect = { left: number; top: number; right: number; bottom: number };

/**
 * リング矩形の外周上の点を、左上から時計回りに測ったスカラー位置へ変換する。
 * 範囲: top 辺 [0, W] → right 辺 [W, W+H] → bottom 辺 [W+H, 2W+H] → left 辺 [2W+H, 2W+2H]。
 * 角は隣り合う 2 辺どちらの式でも同じ値になる。点はリング辺上にある前提だが、
 * 念のため各座標をリング範囲へクランプする。
 */
const perimeterParam = (
	p: Point,
	ring: RingRect,
	width: number,
	height: number,
): number => {
	const clampX = Math.min(Math.max(p.x, ring.left), ring.right);
	const clampY = Math.min(Math.max(p.y, ring.top), ring.bottom);

	if (Math.abs(p.y - ring.top) <= EPS) {
		return clampX - ring.left;
	}
	if (Math.abs(p.x - ring.right) <= EPS) {
		return width + (clampY - ring.top);
	}
	if (Math.abs(p.y - ring.bottom) <= EPS) {
		return width + height + (ring.right - clampX);
	}
	// 残りは left 辺。
	return 2 * width + height + (ring.bottom - clampY);
};

/** 周辺パラメータからリング外周上の座標へ戻す。 */
const pointAtParam = (
	param: number,
	ring: RingRect,
	width: number,
	height: number,
	perimeter: number,
): Point => {
	const t = ((param % perimeter) + perimeter) % perimeter;
	if (t <= width) {
		return { x: ring.left + t, y: ring.top };
	}
	if (t <= width + height) {
		return { x: ring.right, y: ring.top + (t - width) };
	}
	if (t <= 2 * width + height) {
		return { x: ring.right - (t - (width + height)), y: ring.bottom };
	}
	return { x: ring.left, y: ring.bottom - (t - (2 * width + height)) };
};

/**
 * source から target へ指定方向（時計回り / 反時計回り）にリング外周を辿るとき、
 * その弧の内側に来る角を通過順に返す。
 */
const arcCorners = (
	sourceParam: number,
	targetParam: number,
	clockwise: boolean,
	ring: RingRect,
	width: number,
	height: number,
	perimeter: number,
): Point[] => {
	// 角の周辺パラメータ: TL(0) / TR(W) / BR(W+H) / BL(2W+H)。
	const cornerParams = [0, width, width + height, 2 * width + height];
	const arc = clockwise
		? (targetParam - sourceParam + perimeter) % perimeter
		: (sourceParam - targetParam + perimeter) % perimeter;

	return cornerParams
		.map((c) => ({
			param: c,
			offset: clockwise
				? (c - sourceParam + perimeter) % perimeter
				: (sourceParam - c + perimeter) % perimeter,
		}))
		.filter((x) => x.offset > EPS && x.offset < arc - EPS)
		.sort((a, b) => a.offset - b.offset)
		.map((x) => pointAtParam(x.param, ring, width, height, perimeter));
};

/** 直交パスの総延長（セグメント長の和）。 */
const pathLength = (points: Point[]): number => {
	let total = 0;
	for (let i = 1; i < points.length; i++) {
		total +=
			Math.abs(points[i].x - points[i - 1].x) +
			Math.abs(points[i].y - points[i - 1].y);
	}
	return total;
};
