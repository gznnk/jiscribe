import { describe, expect, it } from "vitest";

import { GCP_ICON_BROWSE_GROUP_DECLARATIONS } from "../gcpIconBrowseGroups";
import { gcpIconCatalog } from "../gcpIconCatalog";
import { GCP_ICON_CATALOG_ENTRIES } from "../iconCatalog.generated";

describe("GCP_ICON_BROWSE_GROUP_DECLARATIONS", () => {
	// A release adding a category fails here until the table places it
	it("puts every category the set has into exactly one section, and names no other", () => {
		const declared = GCP_ICON_BROWSE_GROUP_DECLARATIONS.flatMap(
			(group) => group.categories,
		);

		expect([...declared].sort()).toEqual([...gcpIconCatalog.categories].sort());
	});

	it("keys each section once", () => {
		const ids = GCP_ICON_BROWSE_GROUP_DECLARATIONS.map(({ id }) => id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("ends with Other", () => {
		expect(GCP_ICON_BROWSE_GROUP_DECLARATIONS.at(-1)?.id).toBe("other");
	});
});

describe("gcpIconCatalog.listBrowseGroups", () => {
	const groups = gcpIconCatalog.listBrowseGroups();

	it("starts with Compute and holds every icon once", () => {
		expect(groups[0].id).toBe("compute");
		const names = groups.flatMap((group) => group.names);
		expect(names).toHaveLength(Object.keys(GCP_ICON_CATALOG_ENTRIES).length);
		expect(new Set(names)).toEqual(
			new Set(Object.keys(GCP_ICON_CATALOG_ENTRIES)),
		);
	});
});
