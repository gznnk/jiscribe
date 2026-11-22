import { describe, it, expect } from "vitest";

import { botOutline } from "../../../schema/bot/botOutline";
import { buildBotFigure } from "../buildBotFigure";

describe("buildBotFigure", () => {
	it("gives the antenna a hit path, since a stroked stick and ball paint nothing to hit", () => {
		const figure = buildBotFigure(-50, -50, 100, 100);
		// Without it the box above the head is invisible to elementsFromPoint, so no
		// connector can be dropped anywhere near the top anchor.
		expect(figure.hit).toHaveLength(1);
		expect(figure.hit![0]).toMatch(/ Z$/);
	});

	it("shapes the hit path like the outline's post, from the head's top to the box's top", () => {
		const figure = buildBotFigure(-50, -50, 100, 100);
		const headTop = -50 + 100 * 0.3;
		const ballRadius = 100 * 0.08;
		const ballCenterY = -50 + ballRadius;

		const start = figure.hit![0].match(/^M (-?[\d.]+) (-?[\d.]+) V (-?[\d.]+)/);
		expect(Number(start?.[1])).toBeCloseTo(-ballRadius);
		expect(Number(start?.[2])).toBeCloseTo(headTop);
		expect(Number(start?.[3])).toBeCloseTo(ballCenterY);
		const end = figure.hit![0].match(/(-?[\d.]+) (-?[\d.]+) V (-?[\d.]+) Z$/);
		expect(Number(end?.[1])).toBeCloseTo(ballRadius);
		expect(Number(end?.[3])).toBeCloseTo(headTop);

		// The outline's post stands on the same corners.
		const outline = botOutline({ width: 100, height: 100 });
		expect(outline).toContainEqual({ x: -ballRadius, y: headTop });
		expect(outline).toContainEqual({ x: ballRadius, y: ballCenterY });
	});

	it("keeps the head as the only filled silhouette, with the antenna and eyes as detail", () => {
		const figure = buildBotFigure(-50, -50, 100, 100);
		expect(figure.body).toHaveLength(1);
		// The stick, the ball and two eyes.
		expect(figure.detail).toHaveLength(4);
	});

	it("spans the full width with the head and seats the ball's top on the top edge", () => {
		const figure = buildBotFigure(-50, -50, 100, 100);
		const headCoordinates = [...figure.body[0].matchAll(/-?\d+(\.\d+)?/g)].map(
			(match) => Number(match[0]),
		);
		expect(Math.min(...headCoordinates)).toBe(-50);
		expect(Math.max(...headCoordinates)).toBe(50);
		// The ball: centered on x = 0, one radius below the top edge.
		expect(figure.detail![1]).toMatch(/^M -8 -42 /);
	});
});
