import { describe, expect, it } from "vitest";

import { resolveViewPadding } from "../resolveViewPadding";

describe("resolveViewPadding", () => {
	it("fills every missing side with 0", () => {
		expect(resolveViewPadding({ top: 48 })).toEqual({
			top: 48,
			right: 0,
			bottom: 0,
			left: 0,
		});
	});

	it("treats an absent padding as zero on every side", () => {
		expect(resolveViewPadding()).toEqual({
			top: 0,
			right: 0,
			bottom: 0,
			left: 0,
		});
	});
});
