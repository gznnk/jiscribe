import { describe, expect, it } from "vitest";

import { ICON_CATEGORY_TITLES } from "../../schema/icon/iconCategories.generated";
import { ICON_BROWSE_GROUP_DECLARATIONS } from "../iconBrowseGroups";

describe("ICON_BROWSE_GROUP_DECLARATIONS", () => {
	const declaredIds = ICON_BROWSE_GROUP_DECLARATIONS.map(
		(declaration) => declaration.id,
	);

	it("declares no category twice", () => {
		expect(new Set(declaredIds).size).toBe(declaredIds.length);
	});

	/**
	 * A category a lucide release adds would otherwise be left out of the "show
	 * all" view, and its icons with it when they belong to no other.
	 */
	it("declares exactly the categories the generated data has", () => {
		const generatedIds = Object.keys(ICON_CATEGORY_TITLES);
		const declaredIdSet = new Set<string>(declaredIds);
		const undeclaredIds = generatedIds.filter((id) => !declaredIdSet.has(id));
		const unknownIds = declaredIds.filter((id) => !generatedIds.includes(id));
		expect(
			{ undeclaredIds, unknownIds },
			"add a missing category to ICON_BROWSE_GROUP_DECLARATIONS, drop an unknown one",
		).toEqual({ undeclaredIds: [], unknownIds: [] });
	});
});
