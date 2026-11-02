import { describe, expect, it } from "vitest";

import { awsIconCatalog } from "../awsIconCatalog";
import { AWS_ICON_TIERS } from "../AwsIconCatalogEntry";
import {
	AWS_ICON_CATALOG_ENTRIES,
	AWS_ICON_RELEASE,
	AWS_ICON_SOURCE_URL,
} from "../iconCatalog.generated";
import type { AwsTier1Icon } from "../tier1Icons";
import { AWS_TIER1_ICONS } from "../tier1Icons";

/** Seen through the contract's type, not the declaration's literal one, so the type does not pre-empt a comparison with "". */
const TIER1: readonly AwsTier1Icon[] = AWS_TIER1_ICONS;

describe("AWS_ICON_CATALOG_ENTRIES", () => {
	it("carries the source the drawings were taken from", () => {
		expect(AWS_ICON_SOURCE_URL).toMatch(/^https:\/\/.*\.zip$/);
		expect(AWS_ICON_RELEASE).toMatch(/^\d{8}$/);
	});

	it("holds every layer and nothing else", () => {
		const tiers = new Set(
			Object.values(AWS_ICON_CATALOG_ENTRIES).map((entry) => entry.tier),
		);
		expect([...tiers].sort()).toEqual([...AWS_ICON_TIERS].sort());
	});

	it("gives every entry a viewBox of four numbers", () => {
		const malformed = Object.entries(AWS_ICON_CATALOG_ENTRIES).filter(
			([, entry]) => !/^\d+ \d+ \d+ \d+$/.test(entry.viewBox),
		);
		expect(malformed).toEqual([]);
	});

	it("gives every entry a label and a category", () => {
		const empty = Object.entries(AWS_ICON_CATALOG_ENTRIES).filter(
			([, entry]) => entry.label === "" || entry.category === "",
		);
		expect(empty).toEqual([]);
	});

	it("names every entry with its own layer prefix", () => {
		const mismatched = Object.entries(AWS_ICON_CATALOG_ENTRIES).filter(
			([name, entry]) => !name.startsWith(`${entry.tier}/`),
		);
		expect(mismatched).toEqual([]);
	});
});

describe("AWS_TIER1_ICONS", () => {
	it("names an icon that exists for every palette entry", () => {
		const missing = TIER1.filter(
			({ icon }) => AWS_ICON_CATALOG_ENTRIES[icon] === undefined,
		);
		expect(missing).toEqual([]);
	});

	it("names them canonically, so the palette writes the name a document stores", () => {
		const notCanonical = TIER1.filter(
			({ icon }) => awsIconCatalog.resolveName(icon) !== icon,
		);
		expect(notCanonical).toEqual([]);
	});

	it("lists no icon twice and gives each a label", () => {
		const names = TIER1.map(({ icon }) => icon);
		expect(new Set(names).size).toBe(names.length);
		expect(TIER1.filter(({ label }) => label.trim() === "")).toEqual([]);
	});
});
