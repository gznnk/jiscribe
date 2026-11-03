import type { IconSetPaletteEntry } from "@jiscribe/canvas-sdk/doc";
import { describe, expect, it } from "vitest";

import { DEFAULT_GCP_ICON_NAME } from "../../GcpIconDoc";
import { gcpIconCatalog } from "../gcpIconCatalog";
import {
	GCP_ICON_CATALOG_ENTRIES,
	GCP_ICON_CATEGORY_ZIP_URL,
	GCP_ICON_CORE_ZIP_URL,
	GCP_ICON_RELEASE,
	GCP_ICON_SOURCE_URL,
} from "../iconCatalog.generated";
import { GCP_TIER1_ICONS } from "../tier1Icons";

/** Seen through the contract's type, so the literal type does not pre-empt a comparison with "". */
const TIER1: readonly IconSetPaletteEntry[] = GCP_TIER1_ICONS;

describe("GCP_ICON_CATALOG_ENTRIES", () => {
	it("carries the source the drawings were taken from", () => {
		expect(GCP_ICON_SOURCE_URL).toBe("https://cloud.google.com/icons");
		expect(GCP_ICON_CORE_ZIP_URL).toMatch(
			/^https:\/\/.*\/core-products-icons\.zip$/,
		);
		expect(GCP_ICON_CATEGORY_ZIP_URL).toMatch(
			/^https:\/\/.*\/category-icons\.zip$/,
		);
		expect(GCP_ICON_RELEASE).toBe("May 2026");
	});

	it("holds the 19 core products and the 26 categories, named flat in kebab-case", () => {
		const names = Object.keys(GCP_ICON_CATALOG_ENTRIES);
		expect(names).toHaveLength(45);
		expect(
			names.filter((name) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)),
		).toEqual([]);
		expect(gcpIconCatalog.categories).toHaveLength(26);
	});

	it("gives every entry Google's 512 viewBox, a label and a category", () => {
		const malformed = Object.entries(GCP_ICON_CATALOG_ENTRIES).filter(
			([, entry]) =>
				entry.viewBox !== "0 0 512 512" ||
				entry.label === "" ||
				entry.category === "",
		);
		expect(malformed).toEqual([]);
	});

	// The labels are Google's official spellings, not the asset folders'.
	it("labels a core product and a category with Google's official name", () => {
		expect(GCP_ICON_CATALOG_ENTRIES["cloud-spanner"]).toEqual({
			label: "Spanner",
			category: "Databases",
			viewBox: "0 0 512 512",
		});
		expect(GCP_ICON_CATALOG_ENTRIES["ai-machine-learning"]).toEqual({
			label: "AI / Machine Learning",
			category: "AI and Machine Learning",
			viewBox: "0 0 512 512",
		});
	});

	it("files a core product under the category Google lists it in", () => {
		expect(GCP_ICON_CATALOG_ENTRIES["cloud-run"]?.category).toBe("Serverless");
		expect(GCP_ICON_CATALOG_ENTRIES.gke?.category).toBe("Containers");
		expect(GCP_ICON_CATALOG_ENTRIES["vertex-ai"]?.category).toBe(
			"AI and Machine Learning",
		);
	});

	it("draws the default icon from the set", () => {
		expect(GCP_ICON_CATALOG_ENTRIES[DEFAULT_GCP_ICON_NAME]).toBeDefined();
	});
});

describe("GCP_TIER1_ICONS", () => {
	it("names an icon that exists for every palette entry, canonically", () => {
		const notCanonical = TIER1.filter(
			({ icon }) => gcpIconCatalog.resolveName(icon) !== icon,
		);
		expect(notCanonical).toEqual([]);
	});

	it("lists no icon twice, 42 of them: all but Media Services, Mixed Reality and Collaboration", () => {
		const names = TIER1.map(({ icon }) => icon);
		expect(new Set(names).size).toBe(names.length);
		expect(names).toHaveLength(42);
		expect(
			Object.keys(GCP_ICON_CATALOG_ENTRIES).filter(
				(name) => !names.includes(name),
			),
		).toEqual(["collaboration", "media-services", "mixed-reality"]);
	});

	it("labels each with the catalog's official name", () => {
		const relabelled = TIER1.filter(
			({ icon, label }) => GCP_ICON_CATALOG_ENTRIES[icon]?.label !== label,
		);
		expect(relabelled).toEqual([]);
	});
});
