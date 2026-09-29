import { describe, expect, it } from "vitest";

import type { Mods } from "../../../registry/ObjectBehaviorTypes";
import { isAdditiveSelectionMod } from "../isAdditiveSelectionMod";

const mods = (overrides: Partial<Mods> = {}): Mods => ({
	ctrl: false,
	meta: false,
	shift: false,
	alt: false,
	...overrides,
});

describe("isAdditiveSelectionMod", () => {
	it.each([["ctrl"], ["meta"], ["shift"]] as const)(
		"is additive with %s held",
		(key) => {
			expect(isAdditiveSelectionMod(mods({ [key]: true }))).toBe(true);
		},
	);

	it("is not additive with no modifier held", () => {
		expect(isAdditiveSelectionMod(mods())).toBe(false);
	});

	it("is not additive with alt alone", () => {
		expect(isAdditiveSelectionMod(mods({ alt: true }))).toBe(false);
	});
});
