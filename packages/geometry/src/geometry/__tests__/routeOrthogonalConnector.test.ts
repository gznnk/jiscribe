import { describe, it, expect } from "vitest";

import type { BoxFeatures } from "../../types/BoxFeatures";
import { calcFrameBoxFeatures } from "../calcFrameBoxFeatures";
import { isLineIntersectingBox } from "../isLineIntersectingBox";
import {
	routeOrthogonalConnector,
	type OrthogonalConnectorEndpoint,
} from "../routeOrthogonalConnector";

/** 中心 (cx,cy)・幅高さの軸並行 box を作る。 */
const boxAt = (cx: number, cy: number, w = 100, h = 60): BoxFeatures =>
	calcFrameBoxFeatures({
		cx,
		cy,
		width: w,
		height: h,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	});

const allSegmentsOrthogonal = (points: { x: number; y: number }[]): boolean =>
	points.every((p, i) =>
		i === 0 ? true : p.x === points[i - 1].x || p.y === points[i - 1].y,
	);

/** 同一軸上で進行方向が反転する「折り返し（逆走スパイク）」の数。 */
const countReversals = (points: { x: number; y: number }[]): number => {
	let reversals = 0;
	for (let i = 1; i < points.length - 1; i++) {
		const a = points[i - 1];
		const b = points[i];
		const c = points[i + 1];
		const reverseH =
			a.y === b.y && b.y === c.y && (b.x - a.x) * (c.x - b.x) < 0;
		const reverseV =
			a.x === b.x && b.x === c.x && (b.y - a.y) * (c.y - b.y) < 0;
		if (reverseH || reverseV) {
			reversals++;
		}
	}
	return reversals;
};

describe("routeOrthogonalConnector", () => {
	it("フルパスは端点を含み、全セグメントが水平/垂直", () => {
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 150, y: 100 }, // box 右辺中央
			direction: "right",
			box: boxAt(100, 100),
		};
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 450, y: 300 }, // box 左辺中央
			direction: "left",
			box: boxAt(500, 300),
		};
		const path = routeOrthogonalConnector(source, target);
		expect(path[0]).toEqual({ x: 150, y: 100 });
		expect(path[path.length - 1]).toEqual({ x: 450, y: 300 });
		expect(allSegmentsOrthogonal(path)).toBe(true);
		expect(path.length).toBeGreaterThanOrEqual(2);
	});

	it("水平に整列した左右接続は段差のない経路になる（曲がり最小）", () => {
		// 同じ y、右辺→左辺。スタブを出すと一直線に畳まれるのが理想。
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 150, y: 200 },
			direction: "right",
			box: boxAt(100, 200),
		};
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 450, y: 200 },
			direction: "left",
			box: boxAt(500, 200),
		};
		const path = routeOrthogonalConnector(source, target);
		// y が一定（曲がりゼロ）
		expect(path.every((p) => p.y === 200)).toBe(true);
		expect(path).toEqual([
			{ x: 150, y: 200 },
			{ x: 450, y: 200 },
		]);
	});

	it("経路はどちらの図形も貫通しない", () => {
		const sourceBox = boxAt(100, 100);
		const targetBox = boxAt(300, 260);
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 100, y: 130 }, // 下辺中央
			direction: "down",
			box: sourceBox,
		};
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 250, y: 260 }, // 左辺中央
			direction: "left",
			box: targetBox,
		};
		const path = routeOrthogonalConnector(source, target);
		// 端のスタブ脚を除く中間セグメントが box を貫通しない
		for (let i = 1; i < path.length - 2; i++) {
			expect(isLineIntersectingBox(path[i], path[i + 1], sourceBox)).toBe(
				false,
			);
			expect(isLineIntersectingBox(path[i], path[i + 1], targetBox)).toBe(
				false,
			);
		}
	});

	it("free 端点（box=null）はスタブを出さずその点から結ぶ", () => {
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 150, y: 100 },
			direction: "right",
			box: boxAt(100, 100),
		};
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 400, y: 250 },
			direction: "left",
			box: null,
		};
		const path = routeOrthogonalConnector(source, target);
		expect(path[path.length - 1]).toEqual({ x: 400, y: 250 });
		expect(allSegmentsOrthogonal(path)).toBe(true);
	});

	it("退出方向を尊重する（右向きアンカーは右へ抜けてから曲がる）", () => {
		// target が source の真下にあり、素朴だと左へ折り返しがちな配置。
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 150, y: 100 }, // 右辺中央
			direction: "right",
			box: boxAt(100, 100),
		};
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 100, y: 270 }, // 上辺中央
			direction: "up",
			box: boxAt(100, 300),
		};
		const path = routeOrthogonalConnector(source, target);
		// source からの最初の一歩は右（+x）方向
		expect(path[1].x).toBeGreaterThan(path[0].x);
		expect(path[1].y).toBe(path[0].y);
	});

	it("回り込みが必要な配置でも図形にめり込まない（box を貫通しない）", () => {
		// source の右に大きな target box があり、その「右辺」へ入る＝回り込み必須。
		// 固定スタブだけだと box を突っ切ってしまうケース。
		const sourceBox = boxAt(120, 200, 100, 60);
		const targetBox = boxAt(300, 200, 120, 160);
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 170, y: 200 }, // 右辺中央
			direction: "right",
			box: sourceBox,
		};
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 360, y: 200 }, // 右辺中央（回り込んで入る）
			direction: "right",
			box: targetBox,
		};
		const path = routeOrthogonalConnector(source, target);
		expect(allSegmentsOrthogonal(path)).toBe(true);
		// 端のスタブ脚を除く全セグメントがどちらの box も貫通しない
		for (let i = 1; i < path.length - 2; i++) {
			expect(isLineIntersectingBox(path[i], path[i + 1], sourceBox)).toBe(
				false,
			);
			expect(isLineIntersectingBox(path[i], path[i + 1], targetBox)).toBe(
				false,
			);
		}
	});

	it("face 中心が AABB の内側でも（回転図形）退出後に AABB へめり込まない", () => {
		// 回転した図形では face 中心がバウンディングボックスの内側に来る。
		// point.x(170) < AABB 右辺(200)。固定 20px だとスタブ x=190 が AABB 内に留まり、
		// 上へ折れる縦セグメントが AABB を貫通してしまう。AABB 辺基準なら x=220 で外に出る。
		const box = boxAt(100, 100, 200, 200); // AABB: x[0,200], y[0,200]
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 170, y: 100 },
			direction: "right",
			box,
		};
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 250, y: 0 }, // 右上の box 左辺（右へ出てから上へ折れる配置）
			direction: "left",
			box: boxAt(300, 0, 100, 60),
		};
		const path = routeOrthogonalConnector(source, target);
		// 退出脚（最初のセグメント）以外は source の AABB を貫通しない
		for (let i = 1; i < path.length - 1; i++) {
			expect(isLineIntersectingBox(path[i], path[i + 1], box)).toBe(false);
		}
	});

	it("向かい合う左右配置＋縦ずれは中点で折れる S/Z 字になる", () => {
		// 右辺→左辺で向かい合い、y がずれている。片寄せ L ではなく中点で折れる対称ルート。
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 170, y: 130 },
			direction: "right",
			box: boxAt(120, 130, 100, 60),
		};
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 310, y: 270 },
			direction: "left",
			box: boxAt(360, 270, 100, 60),
		};
		const path = routeOrthogonalConnector(source, target);
		// source → (jogX, sy) → (jogX, ty) → target の S 字
		expect(path).toHaveLength(4);
		expect(path[1].x).toBe(path[2].x); // 中央の縦ジョグ
		// ジョグ x は両端のほぼ中点（片寄せ L なら端の近くになる）
		const mid = (path[0].x + path[3].x) / 2;
		expect(Math.abs(path[1].x - mid)).toBeLessThanOrEqual(20);
	});

	it("向かい合う上下配置＋横ずれも中点で折れる S/Z 字になる", () => {
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 130, y: 150 },
			direction: "down",
			box: boxAt(130, 120, 90, 60),
		};
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 320, y: 290 },
			direction: "up",
			box: boxAt(320, 320, 90, 60),
		};
		const path = routeOrthogonalConnector(source, target);
		expect(path).toHaveLength(4);
		expect(path[1].y).toBe(path[2].y); // 中央の横ジョグ
		const mid = (path[0].y + path[3].y) / 2;
		expect(Math.abs(path[1].y - mid)).toBeLessThanOrEqual(20);
	});

	it("右辺→上辺（左上→右下の斜め配置）は 2 線分・1 角の L 字になる", () => {
		// 退出(右)と進入(上)が噛み合う配置。階段状(3角)ではなく素直な L であるべき。
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 150, y: 100 }, // 左上 box の右辺中央
			direction: "right",
			box: boxAt(100, 100, 100, 60),
		};
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 320, y: 230 }, // 右下 box の上辺中央
			direction: "up",
			box: boxAt(320, 260, 100, 60),
		};
		const path = routeOrthogonalConnector(source, target);
		// 角は 1 つ（点は 3 つ）。右へ進んでから下へ折れる。
		expect(path).toEqual([
			{ x: 150, y: 100 },
			{ x: 320, y: 100 },
			{ x: 320, y: 230 },
		]);
	});

	it("出口方向の裏側にある端点へはスタブを逆走せず回り込む（#77 折り返しスパイク回避）", () => {
		// source は右へ出るが target は左後方にある。素朴だと右へ 20 出た直後に
		// 同じ線分を逆走して戻るスパイクになりがちな配置。
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 150, y: 100 }, // 右辺中央 → 右へ出る
			direction: "right",
			box: boxAt(100, 100),
		};
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 150, y: 0 }, // 左辺中央。source の左後方・上にある
			direction: "left",
			box: boxAt(200, 0),
		};
		const path = routeOrthogonalConnector(source, target);
		expect(allSegmentsOrthogonal(path)).toBe(true);
		// 折り返し（逆走スパイク）が無い
		expect(countReversals(path)).toBe(0);
		// source の最初の一歩はスタブ分まっすぐ右へ（途中で折れない）
		expect(path[1].y).toBe(path[0].y);
		expect(path[1].x).toBeGreaterThan(path[0].x);
	});

	it("margin を変えるとスタブの押し出し量が変わる", () => {
		const source: OrthogonalConnectorEndpoint = {
			point: { x: 150, y: 100 },
			direction: "right",
			box: boxAt(100, 100),
		};
		const target: OrthogonalConnectorEndpoint = {
			point: { x: 150, y: 400 }, // 真下方向（縦ずれ）。L 字になる。
			direction: "left",
			box: boxAt(200, 400),
		};
		const path = routeOrthogonalConnector(source, target, { margin: 40 });
		// source 右へ 40 押し出した x=190 を経由する
		expect(path.some((p) => p.x === 190)).toBe(true);
	});
});
