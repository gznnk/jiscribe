import { describe, it, expect } from "vitest";

import { botOutline } from "../bot/botOutline";
import { expectStarShapedAboutCenter } from "./support/expectStarShapedAboutCenter";

describe("botOutline", () => {
	it("is star-shaped about the center, so a connector endpoint moves continuously", () => {
		expectStarShapedAboutCenter(botOutline({ width: 100, height: 100 }));
		expectStarShapedAboutCenter(botOutline({ width: 600, height: 100 }));
		expectStarShapedAboutCenter(botOutline({ width: 100, height: 600 }));
	});

	it("rises over the antenna to the top edge rather than stopping at the head", () => {
		const points = botOutline({ width: 100, height: 100 });
		const top = Math.min(...points.map((point) => point.y));
		expect(top).toBeCloseTo(-50);
		// Only the antenna gets up there: nothing near the top is wider than the ball.
		const nearTop = points.filter((point) => point.y < -50 + 100 * 0.3);
		for (const point of nearTop) {
			expect(Math.abs(point.x)).toBeLessThanOrEqual(100 * 0.08 + 1e-9);
		}
	});

	it("stands the antenna as a post as wide as the ball, from the head up to the ball's center", () => {
		const points = botOutline({ width: 100, height: 100 });
		const ballRadius = 100 * 0.08;
		const headTop = -50 + 100 * 0.3;
		const ballCenterY = -50 + ballRadius;
		expect(points).toContainEqual({ x: -ballRadius, y: headTop });
		expect(points).toContainEqual({ x: -ballRadius, y: ballCenterY });
		expect(points).toContainEqual({ x: ballRadius, y: ballCenterY });
		expect(points).toContainEqual({ x: ballRadius, y: headTop });
	});

	it("reaches both sides and the bottom with the head, having no ears", () => {
		const points = botOutline({ width: 100, height: 100 });
		expect(Math.max(...points.map((point) => Math.abs(point.x)))).toBeCloseTo(
			50,
		);
		expect(Math.max(...points.map((point) => point.y))).toBeCloseTo(50);
	});
});
