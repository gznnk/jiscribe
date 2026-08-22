import { describe, it, expect } from "vitest";

import { CONTAINER_HEADER_HEIGHT } from "../../schema/ContainerDoc";
import { calcContainerHeaderHeight } from "../calcContainerHeaderHeight";

describe("calcContainerHeaderHeight", () => {
	it("falls back to the default when the object carries no value", () => {
		expect(
			calcContainerHeaderHeight({ headerHeight: undefined, height: 200 }),
		).toBe(CONTAINER_HEADER_HEIGHT);
	});

	it("takes the object's own value when it fits inside the box", () => {
		expect(calcContainerHeaderHeight({ headerHeight: 48, height: 200 })).toBe(
			48,
		);
	});

	it("clamps the band to the box height, so the header cannot outgrow the shape", () => {
		expect(calcContainerHeaderHeight({ headerHeight: 400, height: 200 })).toBe(
			200,
		);
	});

	it("clamps the default too, on a box shorter than the default band", () => {
		expect(
			calcContainerHeaderHeight({ headerHeight: undefined, height: 10 }),
		).toBe(10);
	});

	it("keeps the band at exactly the box height when the two match", () => {
		expect(calcContainerHeaderHeight({ headerHeight: 200, height: 200 })).toBe(
			200,
		);
	});

	it("collapses the band on a zero-height box rather than going negative", () => {
		expect(calcContainerHeaderHeight({ headerHeight: 48, height: 0 })).toBe(0);
	});
});
