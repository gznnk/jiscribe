import { describe, it, expect } from "vitest";

import type { IconCategoryId } from "../../schema/icon/iconCategories.generated";
import { ICON_NAMES_BY_CATEGORY } from "../../schema/icon/iconCategories.generated";
import { ICON_NODES } from "../../schema/icon/iconData.generated";
import { ICON_BROWSE_GROUP_DECLARATIONS } from "../iconBrowseGroups";
import { lucideIconStencilCategory } from "../IconStencilCategory";
import { ICON_STENCIL_IDS, IconStencils } from "../IconStencils";

const search = lucideIconStencilCategory.search;
const registeredIds = new Set(IconStencils.map((stencil) => stencil.id));

describe("IconStencils", () => {
	it("registers every icon in the set under its own id", () => {
		expect(IconStencils).toHaveLength(Object.keys(ICON_NODES).length);
		expect(registeredIds.size).toBe(IconStencils.length);
	});

	it("keeps the flyout to its 24 icons, all registered", () => {
		expect(ICON_STENCIL_IDS).toHaveLength(24);
		expect(ICON_STENCIL_IDS[0]).toBe("lucideIconUser");
		expect(ICON_STENCIL_IDS).toContain("lucideIconFileText");
		expect(lucideIconStencilCategory.presetIds).toEqual(ICON_STENCIL_IDS);
		for (const id of ICON_STENCIL_IDS) {
			expect(registeredIds).toContain(id);
		}
	});
});

describe("lucideIconStencilCategory.search", () => {
	it("ranks the exact name first and answers with registered ids", () => {
		const result = search!("lock");

		expect(result.presetIds[0]).toBe("lucideIconLock");
		expect(result.matchCount).toBeGreaterThanOrEqual(result.presetIds.length);
		for (const id of result.presetIds) {
			expect(registeredIds).toContain(id);
		}
	});

	it("answers an empty query with nothing rather than failing", () => {
		expect(search!("")).toEqual({ presetIds: [], matchCount: 0 });
	});
});

describe("lucideIconStencilCategory.browseGroups", () => {
	const browseGroups = lucideIconStencilCategory.browseGroups ?? [];

	it("lays out one section per category, in the declared order", () => {
		expect(browseGroups.map((group) => group.id)).toEqual(
			ICON_BROWSE_GROUP_DECLARATIONS.map((declaration) => declaration.id),
		);
		expect(browseGroups).toHaveLength(42);
		expect(browseGroups[0].label).toEqual({
			en: "Accounts & access",
			ja: "アカウント・アクセス",
		});
	});

	it("lists each section by name, and only registered icons", () => {
		for (const group of browseGroups) {
			const labels = group.presetIds.map(
				(presetId) =>
					IconStencils.find((stencil) => stencil.id === presetId)?.label,
			);
			expect(labels, group.id).toEqual(
				ICON_NAMES_BY_CATEGORY[group.id as IconCategoryId],
			);
			expect([...labels].sort(), group.id).toEqual(labels);
		}
	});

	it("shows every icon at least once, and one in several categories in each", () => {
		const shownIds = new Set(browseGroups.flatMap((group) => group.presetIds));
		expect(shownIds).toEqual(registeredIds);

		const groupsShowingComputer = browseGroups
			.filter((group) => group.presetIds.includes("lucideIconComputer"))
			.map((group) => group.id);
		expect(groupsShowingComputer).toEqual(["devices", "development", "gaming"]);
	});
});
