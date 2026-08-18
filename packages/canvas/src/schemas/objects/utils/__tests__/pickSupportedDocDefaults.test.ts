import { describe, expect, it } from "vitest";

import { pickSupportedDocDefaults } from "../pickSupportedDocDefaults";

describe("pickSupportedDocDefaults", () => {
	const docDefaults = { fontFamily: "serif" };

	it("picks fontFamily when the shape's defaults declare it", () => {
		expect(
			pickSupportedDocDefaults({ fontFamily: "Noto Sans JP" }, docDefaults),
		).toEqual({ fontFamily: "serif" });
	});

	it("returns nothing for shapes without fontFamily (e.g. polyline)", () => {
		expect(pickSupportedDocDefaults({ stroke: "auto" }, docDefaults)).toEqual(
			{},
		);
	});

	it("returns nothing when docDefaults are absent", () => {
		expect(
			pickSupportedDocDefaults({ fontFamily: "Noto Sans JP" }, undefined),
		).toEqual({});
	});
});
