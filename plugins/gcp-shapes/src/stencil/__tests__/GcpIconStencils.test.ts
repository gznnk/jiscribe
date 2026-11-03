import { toIconSetStencilId } from "@jiscribe/canvas-sdk";
import { describe, expect, it } from "vitest";

import { GCP_ICON_CATALOG_ENTRIES } from "../../schema/icon/iconCatalog.generated";
import { GCP_TIER1_ICONS } from "../../schema/icon/tier1Icons";
import { gcpStencilCategory } from "../GcpIconStencilCategory";
import { GCP_ICON_STENCIL_IDS, GcpIconStencils } from "../GcpIconStencils";

const toGcpPresetId = (icon: string): string =>
	toIconSetStencilId("gcpIcon", icon);

const registeredIds = new Set(GcpIconStencils.map((stencil) => stencil.id));

describe("GcpIconStencils", () => {
	it("registers every icon in the set under its own id", () => {
		expect(GcpIconStencils).toHaveLength(
			Object.keys(GCP_ICON_CATALOG_ENTRIES).length,
		);
		expect(registeredIds.size).toBe(GcpIconStencils.length);
	});

	it("keeps the palette to tier 1, in tier 1's order", () => {
		expect(GCP_ICON_STENCIL_IDS).toEqual(
			GCP_TIER1_ICONS.map(({ icon }) => toGcpPresetId(icon)),
		);
		expect(GCP_ICON_STENCIL_IDS[0]).toBe("gcpIconComputeEngine");
		expect(gcpStencilCategory.presetIds).toEqual(GCP_ICON_STENCIL_IDS);
	});

	it("labels a placed palette icon with the product's official name", () => {
		const spanner = GcpIconStencils.find(
			(stencil) => stencil.id === "gcpIconCloudSpanner",
		);
		expect(spanner?.defaultOverrides).toEqual({
			icon: "cloud-spanner",
			text: "Spanner",
		});
	});
});

describe("gcpStencilCategory", () => {
	it("is the Google Cloud category, searchable and browsable", () => {
		expect(gcpStencilCategory.id).toBe("gcp");
		expect(gcpStencilCategory.label).toEqual({
			en: "Google Cloud",
			ja: "Google Cloud",
		});
		expect(gcpStencilCategory.search?.("gce").presetIds).toContain(
			"gcpIconComputeEngine",
		);
	});

	it("lays every registered icon out in a section, each once", () => {
		const presetIds = (gcpStencilCategory.browseGroups ?? []).flatMap(
			(group) => group.presetIds,
		);
		expect(new Set(presetIds)).toEqual(registeredIds);
		expect(presetIds).toHaveLength(registeredIds.size);
	});
});
