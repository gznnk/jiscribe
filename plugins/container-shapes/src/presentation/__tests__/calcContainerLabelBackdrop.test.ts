import { resolveAutoColor } from "@jiscribe/canvas-sdk";
import { describe, expect, it } from "vitest";

import { containerDefinition } from "../../definition";
import { CONTAINER_HEADER_HEIGHT } from "../../schema/ContainerDoc";
import type { ContainerState } from "../../state/ContainerState";
import { calcContainerLabelBackdrop } from "../calcContainerLabelBackdrop";

const STYLE = { fillColor: "#dbeafe", fillAlpha: 0.6 };

const container = (over: Partial<ContainerState> = {}): ContainerState =>
	({ width: 300, height: 200, ...over }) as ContainerState;

describe("calcContainerLabelBackdrop", () => {
	it("paints the body over the whole box, then the header band over its top", () => {
		expect(
			calcContainerLabelBackdrop(
				container({ headerFill: "#1e3a8a", headerHeight: 40 }),
				STYLE,
			),
		).toEqual([
			{
				rect: { x: -150, y: -100, width: 300, height: 200 },
				fill: "#dbeafe",
				fillOpacity: 0.6,
			},
			{
				rect: { x: -150, y: -100, width: 300, height: 40 },
				fill: "#1e3a8a",
				fillOpacity: 0.6,
			},
		]);
	});

	it("draws the band at the default height in the theme surface when the container sets neither", () => {
		const [, band] = calcContainerLabelBackdrop(container(), STYLE);
		expect(band.rect.height).toBe(CONTAINER_HEADER_HEIGHT);
		expect(band.fill).toBe(resolveAutoColor(undefined, "surface"));
		expect(
			calcContainerLabelBackdrop(container({ headerFill: "auto" }), STYLE)[1]
				.fill,
		).toBe(resolveAutoColor("auto", "surface"));
	});

	it("is what the type declares as its backdrop", () => {
		expect(containerDefinition.labelBackdrop).toBe(calcContainerLabelBackdrop);
	});
});
