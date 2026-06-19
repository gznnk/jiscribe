import { describe, it, expect } from "vitest";

import type { Viewport } from "../../../../../states/canvas/Viewport";
import { AUTO_SCROLL_THRESHOLD } from "../../GestureRecognizerConstants";
import { detectEdgeProximity } from "../detectEdgeProximity";

// zoom=1 の標準ビューポート: x:0-800, y:0-600
const viewport: Viewport = {
	minX: 0,
	minY: 0,
	width: 800,
	height: 600,
	zoom: 1,
};

// エッジ判定の閾値（SVG座標系）
const THRESHOLD = AUTO_SCROLL_THRESHOLD; // zoom=1 なので pixel と同じ

describe("detectEdgeProximity", () => {
	describe("中央付近（エッジなし）", () => {
		it("中央座標はどのエッジにも近くない", () => {
			const result = detectEdgeProximity(viewport, 400, 300);
			expect(result.isNearEdge).toBe(false);
			expect(result.horizontal).toBeNull();
			expect(result.vertical).toBeNull();
		});

		it("閾値ちょうどは近接とみなさない（< のみ反応）", () => {
			// distFromLeft = THRESHOLD → not < THRESHOLD
			const result = detectEdgeProximity(viewport, THRESHOLD, 300);
			expect(result.horizontal).toBeNull();
		});
	});

	describe("水平エッジ", () => {
		it("左エッジ近傍（distFromLeft < threshold）を検出する", () => {
			const result = detectEdgeProximity(viewport, THRESHOLD - 1, 300);
			expect(result.horizontal).toBe("left");
			expect(result.isNearEdge).toBe(true);
		});

		it("右エッジ近傍（distFromRight < threshold）を検出する", () => {
			// 右端 = minX + width/zoom = 800
			// distFromRight = 800 - svgX < threshold → svgX > 780
			const result = detectEdgeProximity(viewport, 800 - THRESHOLD + 1, 300);
			expect(result.horizontal).toBe("right");
			expect(result.isNearEdge).toBe(true);
		});
	});

	describe("垂直エッジ", () => {
		it("上エッジ近傍（distFromTop < threshold）を検出する", () => {
			const result = detectEdgeProximity(viewport, 400, THRESHOLD - 1);
			expect(result.vertical).toBe("top");
			expect(result.isNearEdge).toBe(true);
		});

		it("下エッジ近傍（distFromBottom < threshold）を検出する", () => {
			// 下端 = minY + height/zoom = 600
			const result = detectEdgeProximity(viewport, 400, 600 - THRESHOLD + 1);
			expect(result.vertical).toBe("bottom");
			expect(result.isNearEdge).toBe(true);
		});
	});

	describe("コーナー（両方向同時）", () => {
		it("左上コーナーで horizontal='left' かつ vertical='top'", () => {
			const result = detectEdgeProximity(viewport, 1, 1);
			expect(result.horizontal).toBe("left");
			expect(result.vertical).toBe("top");
			expect(result.isNearEdge).toBe(true);
		});

		it("右下コーナーで horizontal='right' かつ vertical='bottom'", () => {
			const result = detectEdgeProximity(viewport, 799, 599);
			expect(result.horizontal).toBe("right");
			expect(result.vertical).toBe("bottom");
		});
	});

	describe("zoom の影響", () => {
		it("zoom=2 のとき閾値は SVG 座標で半分になる", () => {
			const zoomedViewport: Viewport = { ...viewport, zoom: 2 };
			// thresholdInSvg = 20 / 2 = 10
			// distFromLeft = svgX - minX = 9 < 10 → near left
			const near = detectEdgeProximity(zoomedViewport, 9, 300);
			expect(near.horizontal).toBe("left");

			// svgX=10 → distFromLeft=10, not < 10 → not near
			const notNear = detectEdgeProximity(zoomedViewport, 10, 300);
			expect(notNear.horizontal).toBeNull();
		});
	});

	describe("非ゼロ minX/minY のビューポート", () => {
		it("minX=100, minY=50 のオフセットビューポートでも正しく検出する", () => {
			const offsetViewport: Viewport = {
				minX: 100,
				minY: 50,
				width: 800,
				height: 600,
				zoom: 1,
			};
			// 左エッジ: svgX ≈ 100 (minX=100), distFromLeft = svgX - 100 = 5 < 20
			const result = detectEdgeProximity(offsetViewport, 105, 200);
			expect(result.horizontal).toBe("left");
		});
	});
});
