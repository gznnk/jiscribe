import { toIconSetStencilId } from "@jiscribe/canvas-sdk";
import { describe, expect, it } from "vitest";

import { AZURE_ICON_CATALOG_ENTRIES } from "../../schema/icon/iconCatalog.generated";
import { AZURE_TIER1_ICONS } from "../../schema/icon/tier1Icons";
import { azureStencilCategory } from "../AzureIconStencilCategory";
import {
	AZURE_ICON_STENCIL_IDS,
	AzureIconStencils,
} from "../AzureIconStencils";

const toAzurePresetId = (icon: string): string =>
	toIconSetStencilId("azureIcon", icon);

const registeredIds = new Set(AzureIconStencils.map((stencil) => stencil.id));

describe("AzureIconStencils", () => {
	it("registers every icon in the set under its own id", () => {
		expect(AzureIconStencils).toHaveLength(
			Object.keys(AZURE_ICON_CATALOG_ENTRIES).length,
		);
		expect(registeredIds.size).toBe(AzureIconStencils.length);
	});

	it("keeps the palette to tier 1, in tier 1's order", () => {
		expect(AZURE_ICON_STENCIL_IDS).toEqual(
			AZURE_TIER1_ICONS.map(({ icon }) => toAzurePresetId(icon)),
		);
		expect(AZURE_ICON_STENCIL_IDS[0]).toBe("azureIconVirtualMachine");
		expect(azureStencilCategory.presetIds).toEqual(AZURE_ICON_STENCIL_IDS);
	});

	it("labels a placed palette icon with the product's official name", () => {
		const cosmos = AzureIconStencils.find(
			(stencil) => stencil.id === "azureIconAzureCosmosDb",
		);
		expect(cosmos?.defaultOverrides).toEqual({
			icon: "azure-cosmos-db",
			text: "Azure Cosmos DB",
		});
	});
});

describe("azureStencilCategory", () => {
	it("is the Azure category, searchable and browsable", () => {
		expect(azureStencilCategory.id).toBe("azure");
		expect(azureStencilCategory.label).toEqual({ en: "Azure", ja: "Azure" });
		expect(azureStencilCategory.search?.("aks").presetIds).toContain(
			"azureIconKubernetesServices",
		);
	});

	it("lays every registered icon out in a section, each once", () => {
		const presetIds = (azureStencilCategory.browseGroups ?? []).flatMap(
			(group) => group.presetIds,
		);
		expect(new Set(presetIds)).toEqual(registeredIds);
		expect(presetIds).toHaveLength(registeredIds.size);
	});
});
