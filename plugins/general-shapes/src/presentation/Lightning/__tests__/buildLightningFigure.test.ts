import { describe, it, expect } from "vitest";

import { calcLightningPoints } from "../../../schema/lightning/calcLightningPoints";
import { buildPolygonPath } from "../../shared/pictogramPaths";
import { buildLightningFigure } from "../buildLightningFigure";

describe("buildLightningFigure", () => {
	it("draws the very polygon the outline hands to the connector router", () => {
		const figure = buildLightningFigure(-35, -50, 70, 100);
		expect(figure.body).toEqual([
			buildPolygonPath(calcLightningPoints(-35, -50, 70, 100)),
		]);
	});

	it("is a single filled silhouette with no detail lines", () => {
		const figure = buildLightningFigure(-35, -50, 70, 100);
		expect(figure.detail).toBeUndefined();
		expect(figure.hit).toBeUndefined();
	});
});
