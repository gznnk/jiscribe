import { describe, expect, it } from "vitest";

import { azureIconCatalog } from "../azureIconCatalog";
import { AZURE_TIER1_ICON_NAMES } from "../tier1Icons";

const { search, suggestNames } = azureIconCatalog;

describe("azureIconCatalog.search", () => {
	it("shows the palette for an empty term", () => {
		expect(search("")).toEqual({
			names: [...AZURE_TIER1_ICON_NAMES],
			total: AZURE_TIER1_ICON_NAMES.length,
		});
	});

	it("finds an icon through its alias and its category", () => {
		expect(search("aks").names).toContain("kubernetes-services");
		expect(search("AI + Machine Learning").names).toContain("azure-openai");
	});

	it("puts a name opening with the term first", () => {
		expect(search("key vault").names[0]).toBe("key-vaults");
	});
});

describe("azureIconCatalog.suggestNames", () => {
	it("finds a name one typo away, or one a word short", () => {
		expect(suggestNames("virtual-machin")).toContain("virtual-machine");
		expect(suggestNames("network-groups")).toContain("network-security-groups");
	});
});
