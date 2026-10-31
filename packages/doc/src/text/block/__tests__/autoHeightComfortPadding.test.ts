import { describe, expect, it } from "vitest";

import {
	AUTO_HEIGHT_COMFORT_PADDING_EM,
	resolveAutoHeightPaddingEm,
} from "../autoHeightComfortPadding";

describe("resolveAutoHeightPaddingEm", () => {
	it("answers the default for a type that declares none", () => {
		expect(resolveAutoHeightPaddingEm({})).toBe(AUTO_HEIGHT_COMFORT_PADDING_EM);
	});

	it("answers a declared value, 0 included", () => {
		expect(resolveAutoHeightPaddingEm({ autoHeightPaddingEm: 1.5 })).toBe(1.5);
		expect(resolveAutoHeightPaddingEm({ autoHeightPaddingEm: 0 })).toBe(0);
	});

	it.each([Number.NaN, Infinity, -Infinity, -0.25])(
		"reads %s as the default",
		(autoHeightPaddingEm) => {
			expect(resolveAutoHeightPaddingEm({ autoHeightPaddingEm })).toBe(
				AUTO_HEIGHT_COMFORT_PADDING_EM,
			);
		},
	);
});
