import { describe, expect, it } from "vitest";

import { AWS_ICON_BROWSE_GROUP_DECLARATIONS } from "../awsIconBrowseGroups";
import { awsIconCatalog } from "../awsIconCatalog";
import { AWS_ICON_CATALOG_ENTRIES } from "../iconCatalog.generated";
import { AWS_TIER1_ICON_NAMES } from "../tier1Icons";

describe("awsIconCatalog.categories", () => {
	it("lists every category that exists, once each and alphabetically", () => {
		const fromEntries = [
			...new Set(
				Object.values(AWS_ICON_CATALOG_ENTRIES).map((entry) => entry.category),
			),
		];

		expect(
			[...awsIconCatalog.categories].sort((left, right) =>
				left.localeCompare(right),
			),
		).toEqual([...awsIconCatalog.categories]);
		expect([...awsIconCatalog.categories].sort()).toEqual(fromEntries.sort());
	});
});

describe("AWS_ICON_BROWSE_GROUP_DECLARATIONS", () => {
	// A release adding a category fails here until the table places it
	it("puts every category the set has into exactly one section, and names no other", () => {
		const declared = AWS_ICON_BROWSE_GROUP_DECLARATIONS.flatMap(
			(group) => group.categories,
		);

		expect([...declared].sort()).toEqual([...awsIconCatalog.categories].sort());
	});

	it("keys each section by its label in kebab-case, once each", () => {
		for (const { id, label } of AWS_ICON_BROWSE_GROUP_DECLARATIONS) {
			expect(id).toBe(label.toLowerCase().replaceAll(" ", "-"));
		}
		const ids = AWS_ICON_BROWSE_GROUP_DECLARATIONS.map(({ id }) => id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});

describe("awsIconCatalog.listBrowseGroups", () => {
	const groups = awsIconCatalog.listBrowseGroups();

	it("starts with Compute and holds every icon once, every layer included", () => {
		expect(groups[0].id).toBe("compute");
		const names = groups.flatMap((group) => group.names);
		expect(names).toHaveLength(Object.keys(AWS_ICON_CATALOG_ENTRIES).length);
		expect(new Set(names)).toEqual(
			new Set(Object.keys(AWS_ICON_CATALOG_ENTRIES)),
		);
		expect(
			groups
				.find((group) => group.id === "group")
				?.names.every((name) => name.startsWith("group/")),
		).toBe(true);
	});

	it("folds a category spelled two ways into one section", () => {
		const managementGovernance = groups.find(
			(group) => group.id === "management-governance",
		);

		expect(
			new Set(
				managementGovernance?.names.map(
					(name) => AWS_ICON_CATALOG_ENTRIES[name]?.category,
				),
			),
		).toEqual(new Set(["Management Governance", "Management Tools"]));
	});

	it("puts the palette's own icons first in its order, then the rest alphabetically", () => {
		const compute = groups[0].names;
		const fromPalette = AWS_TIER1_ICON_NAMES.filter(
			(name) => AWS_ICON_CATALOG_ENTRIES[name]?.category === "Compute",
		);

		expect(fromPalette.length).toBeGreaterThan(0);
		expect(compute.slice(0, fromPalette.length)).toEqual(fromPalette);
		const rest = compute.slice(fromPalette.length);
		expect(rest).toEqual(
			[...rest].sort((left, right) => left.localeCompare(right)),
		);
	});
});
