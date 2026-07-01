import { describe, it, expect } from "vitest";

import type { Viewport } from "../../../../../states/canvas/Viewport";
import { AUTO_SCROLL_THRESHOLD } from "../../GestureRecognizerConstants";
import { detectEdgeProximity } from "../detectEdgeProximity";

// Standard viewport at zoom=1: x:0-800, y:0-600
const viewport: Viewport = {
	minX: 0,
	minY: 0,
	width: 800,
	height: 600,
	zoom: 1,
};

// Edge-detection threshold (SVG coordinate system)
const THRESHOLD = AUTO_SCROLL_THRESHOLD; // Same as pixels since zoom=1

describe("detectEdgeProximity", () => {
	describe("near the center (no edge)", () => {
		it("center coordinates are not close to any edge", () => {
			const result = detectEdgeProximity(viewport, 400, 300);
			expect(result.isNearEdge).toBe(false);
			expect(result.horizontal).toBeNull();
			expect(result.vertical).toBeNull();
		});

		it("exactly at the threshold is not considered near (responds to < only)", () => {
			// distFromLeft = THRESHOLD → not < THRESHOLD
			const result = detectEdgeProximity(viewport, THRESHOLD, 300);
			expect(result.horizontal).toBeNull();
		});
	});

	describe("horizontal edges", () => {
		it("detects proximity to the left edge (distFromLeft < threshold)", () => {
			const result = detectEdgeProximity(viewport, THRESHOLD - 1, 300);
			expect(result.horizontal).toBe("left");
			expect(result.isNearEdge).toBe(true);
		});

		it("detects proximity to the right edge (distFromRight < threshold)", () => {
			// Right edge = minX + width/zoom = 800
			// distFromRight = 800 - svgX < threshold -> svgX > 780
			const result = detectEdgeProximity(viewport, 800 - THRESHOLD + 1, 300);
			expect(result.horizontal).toBe("right");
			expect(result.isNearEdge).toBe(true);
		});
	});

	describe("vertical edges", () => {
		it("detects proximity to the top edge (distFromTop < threshold)", () => {
			const result = detectEdgeProximity(viewport, 400, THRESHOLD - 1);
			expect(result.vertical).toBe("top");
			expect(result.isNearEdge).toBe(true);
		});

		it("detects proximity to the bottom edge (distFromBottom < threshold)", () => {
			// Bottom edge = minY + height/zoom = 600
			const result = detectEdgeProximity(viewport, 400, 600 - THRESHOLD + 1);
			expect(result.vertical).toBe("bottom");
			expect(result.isNearEdge).toBe(true);
		});
	});

	describe("corners (both directions at once)", () => {
		it("top-left corner gives horizontal='left' and vertical='top'", () => {
			const result = detectEdgeProximity(viewport, 1, 1);
			expect(result.horizontal).toBe("left");
			expect(result.vertical).toBe("top");
			expect(result.isNearEdge).toBe(true);
		});

		it("bottom-right corner gives horizontal='right' and vertical='bottom'", () => {
			const result = detectEdgeProximity(viewport, 799, 599);
			expect(result.horizontal).toBe("right");
			expect(result.vertical).toBe("bottom");
		});
	});

	describe("effect of zoom", () => {
		it("at zoom=2 the threshold is halved in SVG coordinates", () => {
			const zoomedViewport: Viewport = { ...viewport, zoom: 2 };
			// thresholdInSvg = 20 / 2 = 10
			// distFromLeft = svgX - minX = 9 < 10 -> near left
			const near = detectEdgeProximity(zoomedViewport, 9, 300);
			expect(near.horizontal).toBe("left");

			// svgX=10 -> distFromLeft=10, not < 10 -> not near
			const notNear = detectEdgeProximity(zoomedViewport, 10, 300);
			expect(notNear.horizontal).toBeNull();
		});
	});

	describe("viewport with non-zero minX/minY", () => {
		it("detects correctly even with an offset viewport of minX=100, minY=50", () => {
			const offsetViewport: Viewport = {
				minX: 100,
				minY: 50,
				width: 800,
				height: 600,
				zoom: 1,
			};
			// Left edge: svgX ~ 100 (minX=100), distFromLeft = svgX - 100 = 5 < 20
			const result = detectEdgeProximity(offsetViewport, 105, 200);
			expect(result.horizontal).toBe("left");
		});
	});
});
