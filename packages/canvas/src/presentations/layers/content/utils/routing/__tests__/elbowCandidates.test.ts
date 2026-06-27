import type { Point } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import { directionsFace, elbowCandidates } from "../elbowCandidates";

const orthogonal = (pts: Point[]): boolean =>
	pts.every((p, i) =>
		i === 0 ? true : p.x === pts[i - 1].x || p.y === pts[i - 1].y,
	);

describe("directionsFace", () => {
	it("左右が正面に向かい合うと x:true", () => {
		expect(directionsFace("right", "left")).toEqual({ x: true, y: false });
		expect(directionsFace("left", "right")).toEqual({ x: true, y: false });
	});

	it("上下が正面に向かい合うと y:true", () => {
		expect(directionsFace("up", "down")).toEqual({ x: false, y: true });
		expect(directionsFace("down", "up")).toEqual({ x: false, y: true });
	});

	it("噛み合わない向きはどちらも false", () => {
		expect(directionsFace("right", "up")).toEqual({ x: false, y: false });
		expect(directionsFace("right", "right")).toEqual({ x: false, y: false });
	});
});

describe("elbowCandidates", () => {
	const a: Point = { x: 0, y: 0 };
	const b: Point = { x: 100, y: 40 };

	it("free 端点では両スタブ端と中点の x/y チャネルを列挙する", () => {
		// box=null なので xs={0,100,50}, ys={0,40,20} → 各3本＝計6候補
		const candidates = elbowCandidates(a, b, null, null, 20, false, false);
		expect(candidates).toHaveLength(6);
		// すべて [a, 角, 角, b] の4点で水平/垂直のみ
		for (const { elbow } of candidates) {
			expect(elbow).toHaveLength(4);
			expect(elbow[0]).toEqual(a);
			expect(elbow[3]).toEqual(b);
			expect(orthogonal(elbow)).toBe(true);
		}
	});

	it("facingX のとき midX で折れる候補に symmetric が立つ", () => {
		const candidates = elbowCandidates(a, b, null, null, 20, true, false);
		// midX = 50 の縦チャネル候補が symmetric
		const symmetric = candidates.filter((c) => c.symmetric);
		expect(symmetric).toHaveLength(1);
		expect(symmetric[0].elbow).toEqual([
			{ x: 0, y: 0 },
			{ x: 50, y: 0 },
			{ x: 50, y: 40 },
			{ x: 100, y: 40 },
		]);
	});

	it("box があると外周クリアランス（辺 ± margin）チャネルが候補に加わる", () => {
		// 同条件で box 付きの方が候補数が増える（回り込みチャネルが入る）
		const sourceBox = {
			left: -50,
			right: 50,
			top: -30,
			bottom: 30,
			center: { x: 0, y: 0 },
			topLeft: { x: -50, y: -30 },
			bottomLeft: { x: -50, y: 30 },
			topRight: { x: 50, y: -30 },
			bottomRight: { x: 50, y: 30 },
		};
		const withoutBox = elbowCandidates(a, b, null, null, 20, false, false);
		const withBox = elbowCandidates(a, b, sourceBox, null, 20, false, false);
		expect(withBox.length).toBeGreaterThan(withoutBox.length);
	});
});
