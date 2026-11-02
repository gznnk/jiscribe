import { describe, expect, it } from "vitest";

import { AZURE_ICON_BROWSE_GROUP_DECLARATIONS } from "../azureIconBrowseGroups";
import { azureIconCatalog } from "../azureIconCatalog";
import { AZURE_ICON_CATALOG_ENTRIES } from "../iconCatalog.generated";

describe("AZURE_ICON_BROWSE_GROUP_DECLARATIONS", () => {
	// A release adding a category fails here until the table places it
	it("puts every category the set has into exactly one section, and names no other", () => {
		const declared = AZURE_ICON_BROWSE_GROUP_DECLARATIONS.flatMap(
			(group) => group.categories,
		);

		expect([...declared].sort()).toEqual(
			[...azureIconCatalog.categories].sort(),
		);
	});

	it("keys each section by its label in kebab-case, `+` dropped, once each", () => {
		for (const { id, label } of AZURE_ICON_BROWSE_GROUP_DECLARATIONS) {
			expect(id).toBe(
				label.toLowerCase().replaceAll("+", "").split(/\s+/).join("-"),
			);
		}
		const ids = AZURE_ICON_BROWSE_GROUP_DECLARATIONS.map(({ id }) => id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("ends with General and Other", () => {
		expect(
			AZURE_ICON_BROWSE_GROUP_DECLARATIONS.slice(-2).map(({ id }) => id),
		).toEqual(["general", "other"]);
	});
});

describe("azureIconCatalog.listBrowseGroups", () => {
	const groups = azureIconCatalog.listBrowseGroups();

	it("starts with Compute and holds every icon once", () => {
		expect(groups[0].id).toBe("compute");
		const names = groups.flatMap((group) => group.names);
		expect(names).toHaveLength(Object.keys(AZURE_ICON_CATALOG_ENTRIES).length);
		expect(new Set(names)).toEqual(
			new Set(Object.keys(AZURE_ICON_CATALOG_ENTRIES)),
		);
	});

	it("folds the catch-all folders into General and Other", () => {
		const categoriesOf = (id: string) =>
			new Set(
				groups
					.find((group) => group.id === id)
					?.names.map((name) => AZURE_ICON_CATALOG_ENTRIES[name]?.category),
			);

		expect(categoriesOf("general")).toEqual(new Set(["General", "Menu"]));
		expect(categoriesOf("other")).toEqual(new Set(["Other", "New Icons"]));
	});
});
