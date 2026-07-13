import { describe, it, expect } from "vitest";

import {
	DB_CAP_RATIO,
	DbFeatures,
} from "../../../../schemas/objects/primitives/db/DbDoc";
import { calcTextRegion } from "../calcTextRegion";

describe("calcTextRegion", () => {
	it("returns the full bbox (center-origin local coordinates) when spec is omitted", () => {
		const result = calcTextRegion({ width: 100, height: 60 });
		expect(result).toEqual({ x: -50, y: -30, width: 100, height: 60 });
	});

	it("returns the region with a ratio-inset spec applied", () => {
		const result = calcTextRegion(
			{ width: 100, height: 60 },
			{ unit: "ratio", inset: { top: 0.25 } },
		);
		expect(result).toEqual({ x: -50, y: -15, width: 100, height: 45 });
	});

	it("DbFeatures.textRegion returns the body region starting at the cap bottom", () => {
		const result = calcTextRegion(
			{ width: 120, height: 100 },
			DbFeatures.textRegion,
		);
		const capBottom = -50 + 100 * DB_CAP_RATIO * 2;
		expect(result).toEqual({
			x: -60,
			y: capBottom,
			width: 120,
			height: 50 - capBottom,
		});
	});

	it("a spec with an empty inset returns the same region as omitting the spec", () => {
		const withEmptySpec = calcTextRegion(
			{ width: 80, height: 40 },
			{ unit: "ratio", inset: {} },
		);
		const withoutSpec = calcTextRegion({ width: 80, height: 40 });
		expect(withEmptySpec).toEqual(withoutSpec);
	});
});
