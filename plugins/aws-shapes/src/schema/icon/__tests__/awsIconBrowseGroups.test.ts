import { describe, expect, it } from "vitest";

import {
	AWS_ICON_BROWSE_GROUP_DECLARATIONS,
	AWS_ICON_CATEGORIES,
	listAwsIconBrowseGroups,
} from "../awsIconBrowseGroups";
import { AWS_ICON_ENTRIES } from "../iconData.generated";
import { AWS_TIER1_ICON_NAMES } from "../tier1Icons";

describe("AWS_ICON_CATEGORIES", () => {
	it("lists every category that exists, once each and alphabetically", () => {
		const fromEntries = [
			...new Set(
				Object.values(AWS_ICON_ENTRIES).map((entry) => entry.category),
			),
		];

		expect(
			[...AWS_ICON_CATEGORIES].sort((left, right) => left.localeCompare(right)),
		).toEqual([...AWS_ICON_CATEGORIES]);
		expect([...AWS_ICON_CATEGORIES].sort()).toEqual(fromEntries.sort());
	});
});

describe("AWS_ICON_BROWSE_GROUP_DECLARATIONS", () => {
	// A release adding a category fails here until the table places it
	it("puts every category the set has into exactly one section, and names no other", () => {
		const declared = AWS_ICON_BROWSE_GROUP_DECLARATIONS.flatMap(
			(group) => group.categories,
		);

		expect([...declared].sort()).toEqual([...AWS_ICON_CATEGORIES].sort());
	});

	it("keys each section by its label in kebab-case, once each", () => {
		for (const { id, label } of AWS_ICON_BROWSE_GROUP_DECLARATIONS) {
			expect(id).toBe(label.toLowerCase().replaceAll(" ", "-"));
		}
		const ids = AWS_ICON_BROWSE_GROUP_DECLARATIONS.map(({ id }) => id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});

describe("listAwsIconBrowseGroups", () => {
	const groups = listAwsIconBrowseGroups();

	it("starts with Compute and holds every icon once, every layer included", () => {
		expect(groups[0].id).toBe("compute");
		const names = groups.flatMap((group) => group.names);
		expect(names).toHaveLength(Object.keys(AWS_ICON_ENTRIES).length);
		expect(new Set(names)).toEqual(new Set(Object.keys(AWS_ICON_ENTRIES)));
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
					(name) => AWS_ICON_ENTRIES[name]?.category,
				),
			),
		).toEqual(new Set(["Management Governance", "Management Tools"]));
	});

	it("puts the palette's own icons first in its order, then the rest alphabetically", () => {
		const compute = groups[0].names;
		const fromPalette = AWS_TIER1_ICON_NAMES.filter(
			(name) => AWS_ICON_ENTRIES[name]?.category === "Compute",
		);

		expect(fromPalette.length).toBeGreaterThan(0);
		expect(compute.slice(0, fromPalette.length)).toEqual(fromPalette);
		const rest = compute.slice(fromPalette.length);
		expect(rest).toEqual(
			[...rest].sort((left, right) => left.localeCompare(right)),
		);
	});
});
