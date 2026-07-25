import { describe, it, expect } from "vitest";

import { ACTOR_FIGURE_RATIO } from "../../../../../schemas/objects/general/actor/ActorDoc";
import { expectRectCloseTo } from "../../../__tests__/support/expectRectCloseTo";
import { buildActorFigure } from "../buildActorFigure";
import { calcActorTextRegion } from "../calcActorTextRegion";

describe("calcActorTextRegion", () => {
	it("takes the caption band below the figure, spanning the full width", () => {
		expectRectCloseTo(calcActorTextRegion({ width: 80, height: 100 }), {
			x: -40,
			y: -50 + 100 * ACTOR_FIGURE_RATIO,
			width: 80,
			height: 100 * (1 - ACTOR_FIGURE_RATIO),
		});
	});

	it("is centered on the origin, matching the shape's local coordinates", () => {
		const region = calcActorTextRegion({ width: 80, height: 100 });
		expect(region.x + region.width / 2).toBeCloseTo(0);
		expect(region.y + region.height).toBeCloseTo(50);
	});

	it("does not overlap the figure band that buildActorFigure fills", () => {
		const [width, height] = [80, 100];
		const region = calcActorTextRegion({ width, height });
		// buildActorFigure lays out from a top-left origin; the region is centered.
		const figure = buildActorFigure(-width / 2, -height / 2, width, height);
		const figureBottom = -height / 2 + height * ACTOR_FIGURE_RATIO;

		expect(region.y).toBeCloseTo(figureBottom);
		expect(figure.headCy + figure.headR).toBeLessThan(region.y);
	});

	it("follows the box size", () => {
		const region = calcActorTextRegion({ width: 160, height: 200 });
		expect(region.width).toBeCloseTo(160);
		expect(region.height).toBeCloseTo(200 * (1 - ACTOR_FIGURE_RATIO));
	});

	it("collapses to zero for a zero-sized box", () => {
		expectRectCloseTo(calcActorTextRegion({ width: 0, height: 0 }), {
			x: 0,
			y: 0,
			width: 0,
			height: 0,
		});
	});
});
