import { describe, expect, it } from "vitest";

import { COMMON_ICON_NAMES } from "../commonIconNames";
import { ICON_NODES } from "../iconData.generated";
import { resolveIconName } from "../resolveIconName";

describe("COMMON_ICON_NAMES", () => {
	/**
	 * The list is written by hand and the icon set moves under it, so a name that was
	 * renamed away has to fail here rather than reach the picker as a blank cell and the
	 * AI docs as a suggestion that resolves to nothing.
	 */
	it("names an icon that exists, by its current name", () => {
		for (const name of COMMON_ICON_NAMES) {
			expect(ICON_NODES, name).toHaveProperty(name);
		}
	});

	it("resolves every name without going through the alias table", () => {
		for (const name of COMMON_ICON_NAMES) {
			expect(resolveIconName(name)).toBe(name);
		}
	});

	it("lists each name once", () => {
		expect(new Set(COMMON_ICON_NAMES).size).toBe(COMMON_ICON_NAMES.length);
	});
});
