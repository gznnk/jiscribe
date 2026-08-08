import { describe, expect, it } from "vitest";

import { offPageConnectorOutlinePoints } from "../buildOffPageConnectorPoints";
import { calcOffPageConnectorAnchorRegion } from "../calcOffPageConnectorAnchorRegion";

describe("calcOffPageConnectorAnchorRegion", () => {
	it("spans the rectangular band above the tip", () => {
		expect(
			calcOffPageConnectorAnchorRegion({ width: 100, height: 100 }),
		).toEqual({ x: -50, y: -50, width: 100, height: 70 });
	});

	it("centers vertically on the shoulder, where the outline still has vertical edges", () => {
		const width = 120;
		const height = 80;
		const region = calcOffPageConnectorAnchorRegion({ width, height });
		const centerY = region.y + region.height / 2;

		// The outline's shoulder (last y at full width) is the lowest point the side
		// anchors may sit at; the region center must stay above it.
		const [, , shoulder] = offPageConnectorOutlinePoints(
			-width / 2,
			-height / 2,
			width,
			height,
		);
		expect(centerY).toBeLessThan(shoulder.y);
		expect(centerY).toBeLessThan(0);
	});
});
