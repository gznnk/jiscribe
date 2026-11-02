import type { IconSetPaletteEntry } from "@jiscribe/canvas-sdk/doc";
import { describe, expect, it } from "vitest";

import { DEFAULT_AZURE_ICON_NAME } from "../../AzureIconDoc";
import { azureIconCatalog } from "../azureIconCatalog";
import {
	AZURE_ICON_CATALOG_ENTRIES,
	AZURE_ICON_RELEASE,
	AZURE_ICON_SOURCE_URL,
	ENTRA_ICON_RELEASE,
	ENTRA_ICON_SOURCE_URL,
} from "../iconCatalog.generated";
import { AZURE_TIER1_ICONS } from "../tier1Icons";

/** Seen through the contract's type, so the literal type does not pre-empt a comparison with "". */
const TIER1: readonly IconSetPaletteEntry[] = AZURE_TIER1_ICONS;

describe("AZURE_ICON_CATALOG_ENTRIES", () => {
	it("carries the source the drawings were taken from", () => {
		expect(AZURE_ICON_SOURCE_URL).toMatch(/^https:\/\/.*V24\.zip$/);
		expect(AZURE_ICON_RELEASE).toBe("V24, 2026-07");
		expect(ENTRA_ICON_SOURCE_URL).toMatch(/^https:\/\/.*Oct%202023\.zip$/);
		expect(ENTRA_ICON_RELEASE).toBe("Oct 2023");
	});

	// The Azure package has no Entra ID icon; it comes from Entra's own package.
	it("holds Microsoft Entra ID, filed under Identity", () => {
		expect(AZURE_ICON_CATALOG_ENTRIES["entra-id"]).toEqual({
			label: "Microsoft Entra ID",
			category: "Identity",
			viewBox: "0 0 18 18",
		});
	});

	it("holds one entry per distinct icon, named flat in kebab-case", () => {
		const names = Object.keys(AZURE_ICON_CATALOG_ENTRIES);
		expect(names).toHaveLength(637);
		expect(
			names.filter((name) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)),
		).toEqual([]);
	});

	it("gives every entry a viewBox of four numbers, a label and a category", () => {
		const malformed = Object.entries(AZURE_ICON_CATALOG_ENTRIES).filter(
			([, entry]) =>
				!/^0 0 [\d.]+ [\d.]+$/.test(entry.viewBox) ||
				entry.label === "" ||
				entry.category === "",
		);
		expect(malformed).toEqual([]);
	});

	// Microsoft misspells the root's viewBox `xviewBox` in one file; the
	// generator builds it from width / height instead of dropping it.
	it("reads the viewBox of the asset that misspells it", () => {
		expect(AZURE_ICON_CATALOG_ENTRIES["foundry-control-plane"]?.viewBox).toBe(
			"0 0 18 18",
		);
	});

	it("files an icon kept in several folders under its subject folder", () => {
		expect(AZURE_ICON_CATALOG_ENTRIES["app-services"]?.category).toBe(
			"App Services",
		);
		expect(AZURE_ICON_CATALOG_ENTRIES["azure-cosmos-db"]?.category).toBe(
			"Databases",
		);
	});

	it("draws the default icon from the set", () => {
		expect(AZURE_ICON_CATALOG_ENTRIES[DEFAULT_AZURE_ICON_NAME]).toBeDefined();
	});
});

describe("AZURE_TIER1_ICONS", () => {
	it("names an icon that exists for every palette entry, canonically", () => {
		const notCanonical = TIER1.filter(
			({ icon }) => azureIconCatalog.resolveName(icon) !== icon,
		);
		expect(notCanonical).toEqual([]);
	});

	it("lists no icon twice and gives each a label", () => {
		const names = TIER1.map(({ icon }) => icon);
		expect(new Set(names).size).toBe(names.length);
		expect(TIER1.filter(({ label }) => label.trim() === "")).toEqual([]);
	});
});
