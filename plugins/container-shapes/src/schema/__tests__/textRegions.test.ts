import { describe, it, expect } from "vitest";

import { CONTAINER_HEADER_HEIGHT } from "../ContainerDoc";
import { calcContainerTextRegion } from "../textRegions";

describe("calcContainerTextRegion", () => {
	it("occupies the header band across the full width, from the box's top-left", () => {
		expect(
			calcContainerTextRegion({
				width: 200,
				height: 160,
				headerHeight: undefined,
			}),
		).toEqual({
			x: -100,
			y: -80,
			width: 200,
			height: CONTAINER_HEADER_HEIGHT,
		});
	});

	it("follows the object's own band height", () => {
		expect(
			calcContainerTextRegion({ width: 200, height: 160, headerHeight: 48 })
				.height,
		).toBe(48);
	});

	it("leaves the body free, which is where the contained objects sit", () => {
		const region = calcContainerTextRegion({
			width: 200,
			height: 160,
			headerHeight: 48,
		});
		expect(region.y + region.height).toBeLessThan(160 / 2);
	});

	it("stops at the bottom edge when the band is taller than the box", () => {
		const region = calcContainerTextRegion({
			width: 200,
			height: 160,
			headerHeight: 400,
		});
		expect(region.height).toBe(160);
		expect(region.y + region.height).toBe(80);
	});
});
