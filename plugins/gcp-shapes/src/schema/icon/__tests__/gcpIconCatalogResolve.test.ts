import { createIconSetCatalog } from "@jiscribe/canvas-sdk/doc";
import { describe, expect, it } from "vitest";

import { GCP_ICON_BROWSE_GROUP_DECLARATIONS } from "../gcpIconBrowseGroups";
import { gcpIconCatalog } from "../gcpIconCatalog";
import { GCP_GENERAL_PRODUCT_ICONS } from "../generalProducts";
import { GCP_ICON_ALIASES } from "../iconAliases";
import { GCP_ICON_CATALOG_ENTRIES } from "../iconCatalog.generated";

const { readLabel, resolveName, validateIconName } = gcpIconCatalog;

/** The same set with no alias table, to see which spellings resolve without one. */
const withoutAliases = createIconSetCatalog({
	setLabel: "Google Cloud",
	entries: GCP_ICON_CATALOG_ENTRIES,
	aliases: {},
	palette: [],
	browseGroups: GCP_ICON_BROWSE_GROUP_DECLARATIONS,
	listShorthands: () => [],
});

describe("gcpIconCatalog.resolveName", () => {
	it("passes a canonical name through", () => {
		expect(resolveName("compute-engine")).toBe("compute-engine");
		expect(resolveName("networking")).toBe("networking");
	});

	it("resolves the short names of the alias table", () => {
		expect(resolveName("gce")).toBe("compute-engine");
		expect(resolveName("gcs")).toBe("cloud-storage");
		expect(resolveName("spanner")).toBe("cloud-spanner");
		expect(resolveName("sql")).toBe("cloud-sql");
		expect(resolveName("google-kubernetes-engine")).toBe("gke");
	});

	it("resolves a product without an icon of its own to its category's icon", () => {
		expect(resolveName("pubsub")).toBe("data-analytics");
		expect(resolveName("cloud-functions")).toBe("serverless-computing");
		expect(resolveName("vpc")).toBe("networking");
		expect(resolveName("iam")).toBe("security-identity");
	});

	it("resolves a starred product with no icon of its own to the core icon it belongs to", () => {
		expect(resolveName("looker-studio")).toBe("looker");
		expect(resolveName("bigquery-omni")).toBe("bigquery");
		expect(resolveName("alloydb-omni")).toBe("alloydb");
		expect(resolveName("earth-engine")).toBe("maps-geospatial");
	});

	it("resolves a spelling variant of any of those", () => {
		expect(resolveName("ComputeEngine")).toBe("compute-engine");
		expect(resolveName("Cloud Run")).toBe("cloud-run");
		expect(resolveName("Pub/Sub")).toBe("data-analytics");
		expect(resolveName("GCE")).toBe("compute-engine");
	});

	it("returns null for a name nothing answers to", () => {
		expect(resolveName("does-not-exist")).toBeNull();
		expect(resolveName("constructor")).toBeNull();
		// Google's Gemini icon is not in the packages.
		expect(resolveName("gemini")).toBeNull();
	});
});

describe("gcpIconCatalog.readLabel", () => {
	it("labels an icon with the product's official name", () => {
		expect(readLabel("gce")).toBe("Compute Engine");
		expect(readLabel("cloud-spanner")).toBe("Spanner");
		expect(readLabel("collaboration")).toBe(
			GCP_ICON_CATALOG_ENTRIES.collaboration?.label,
		);
	});
});

describe("gcpIconCatalog.validateIconName", () => {
	const validate = (icon: unknown) =>
		validateIconName({ icon } as never, "root[0]");

	it("names the set in the message, with candidates where there are some", () => {
		expect(validate("qqqqzzzzxxxxvvvv")[0]?.message).toBe(
			'unknown Google Cloud icon "qqqqzzzzxxxxvvvv" (see the icon list in the AI reference)',
		);
		expect(validate("gke")).toEqual([]);
		expect(validate("dataflow")).toEqual([]);
	});
});

describe("GCP_ICON_ALIASES and GCP_GENERAL_PRODUCT_ICONS", () => {
	const tables = {
		GCP_ICON_ALIASES,
		GCP_GENERAL_PRODUCT_ICONS,
	};

	it.each(Object.entries(tables))(
		"%s points every name at an icon that exists",
		(_, table) => {
			const dangling = Object.entries(table).filter(
				([, target]) => GCP_ICON_CATALOG_ENTRIES[target] === undefined,
			);
			expect(dangling).toEqual([]);
		},
	);

	it.each(Object.entries(tables))(
		"%s never shadows a canonical name",
		(_, table) => {
			const shadowing = Object.keys(table).filter(
				(alias) => GCP_ICON_CATALOG_ENTRIES[alias] !== undefined,
			);
			expect(shadowing).toEqual([]);
		},
	);

	// Both are handed to the catalog as one table, where a key in both would
	// silently take the alias table's target.
	it("share no key", () => {
		const productNames = new Set(Object.keys(GCP_GENERAL_PRODUCT_ICONS));
		const shared = Object.keys(GCP_ICON_ALIASES).filter((alias) =>
			productNames.has(alias),
		);
		expect(shared).toEqual([]);
	});

	// An alias for what a name already reaches would only be a second place to
	// keep in step.
	it.each(Object.entries(tables))(
		"%s lists only spellings that resolve to nothing without it",
		(_, table) => {
			const redundant = Object.keys(table).filter(
				(alias) => withoutAliases.resolveName(alias) !== null,
			);
			expect(redundant).toEqual([]);
		},
	);
});
