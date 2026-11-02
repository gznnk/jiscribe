import { describe, expect, it } from "vitest";

import { LUCIDE_CATEGORIES_VERSION } from "../iconCategories.generated";
import { LUCIDE_VERSION } from "../iconData.generated";

describe("iconCategories.generated", () => {
	/**
	 * The two modules come out of one run of the generator; one of them left on an
	 * older release would file icons under categories of another version.
	 */
	it("was generated from the same lucide version as the drawings", () => {
		expect(LUCIDE_CATEGORIES_VERSION).toBe(LUCIDE_VERSION);
	});
});
