import { createIconSetCatalog } from "@jiscribe/canvas-sdk/doc";
import { describe, expect, it } from "vitest";

import { AZURE_ICON_BROWSE_GROUP_DECLARATIONS } from "../azureIconBrowseGroups";
import { azureIconCatalog, listAzureIconShorthands } from "../azureIconCatalog";
import { AZURE_ICON_ALIASES } from "../iconAliases";
import { AZURE_ICON_CATALOG_ENTRIES } from "../iconCatalog.generated";

const { readLabel, resolveName, validateIconName } = azureIconCatalog;

/** The same set with no alias table, to see which spellings resolve without one. */
const withoutAliases = createIconSetCatalog({
	setLabel: "Azure",
	entries: AZURE_ICON_CATALOG_ENTRIES,
	aliases: {},
	palette: [],
	browseGroups: AZURE_ICON_BROWSE_GROUP_DECLARATIONS,
	listShorthands: listAzureIconShorthands,
});

describe("listAzureIconShorthands", () => {
	it("drops the vendor prefix, and has nothing for a name without one", () => {
		expect(listAzureIconShorthands("azure-cosmos-db")).toEqual(["cosmos-db"]);
		expect(listAzureIconShorthands("microsoft-defender-for-cloud")).toEqual([
			"defender-for-cloud",
		]);
		expect(listAzureIconShorthands("virtual-machine")).toEqual([]);
	});
});

describe("azureIconCatalog.resolveName", () => {
	it("passes a canonical name through", () => {
		expect(resolveName("virtual-machine")).toBe("virtual-machine");
		expect(resolveName("azure-cosmos-db")).toBe("azure-cosmos-db");
	});

	it("resolves the short names of the alias table", () => {
		expect(resolveName("vm")).toBe("virtual-machine");
		expect(resolveName("aks")).toBe("kubernetes-services");
		expect(resolveName("vnet")).toBe("virtual-networks");
	});

	it("resolves a name with the vendor prefix dropped", () => {
		expect(resolveName("cosmos-db")).toBe("azure-cosmos-db");
		expect(resolveName("service-bus")).toBe("azure-service-bus");
		expect(resolveName("openai")).toBe("azure-openai");
	});

	// `azure-workbooks` would shorten to `workbooks`, which is a name of its own.
	it("does not let a shorthand take over a canonical name", () => {
		expect(resolveName("workbooks")).toBe("workbooks");
	});

	it("resolves a spelling variant of any of those", () => {
		expect(resolveName("VirtualMachine")).toBe("virtual-machine");
		expect(resolveName("Cosmos DB")).toBe("azure-cosmos-db");
		expect(resolveName("AKS")).toBe("kubernetes-services");
	});

	it("absorbs the brackets and the trailing space of the file names", () => {
		expect(resolveName("container-services-deprecated")).toBe(
			"container-services-deprecated",
		);
		expect(resolveName("arc-postgresql")).toBe("arc-postgresql");
	});

	it("returns null for a name nothing answers to", () => {
		expect(resolveName("does-not-exist")).toBeNull();
		expect(resolveName("constructor")).toBeNull();
	});
});

describe("azureIconCatalog.readLabel", () => {
	it("labels a palette icon with the product's official name", () => {
		expect(readLabel("vm")).toBe("Virtual Machines");
		expect(readLabel("cosmos")).toBe("Azure Cosmos DB");
		expect(readLabel("workbooks")).toBe(
			AZURE_ICON_CATALOG_ENTRIES.workbooks?.label,
		);
	});
});

describe("azureIconCatalog.validateIconName", () => {
	const validate = (icon: unknown) =>
		validateIconName({ icon } as never, "root[0]");

	it("names the set in the message, with candidates where there are some", () => {
		expect(validate("app-servicez")[0]?.message).toBe(
			'unknown Azure icon "app-servicez" — did you mean "app-services"?',
		);
		expect(validate("qqqqzzzzxxxxvvvv")[0]?.message).toBe(
			'unknown Azure icon "qqqqzzzzxxxxvvvv" (see the icon list in the AI reference)',
		);
		expect(validate("aks")).toEqual([]);
	});
});

describe("the Entra names", () => {
	it.each([
		["entra", "entra-id"],
		["aad", "entra-id"],
		["azure-ad", "entra-id"],
		["azure-active-directory", "entra-id"],
		["entra-id-governance", "identity-governance"],
		["entra-workload-id", "app-registrations"],
	])("resolves %s to %s", (alias, target) => {
		expect(resolveName(alias)).toBe(target);
	});
});

describe("AZURE_ICON_ALIASES", () => {
	it("points every short name at an icon that exists", () => {
		const dangling = Object.entries(AZURE_ICON_ALIASES).filter(
			([, target]) => AZURE_ICON_CATALOG_ENTRIES[target] === undefined,
		);
		expect(dangling).toEqual([]);
	});

	it("never shadows a canonical name", () => {
		const shadowing = Object.keys(AZURE_ICON_ALIASES).filter(
			(alias) => AZURE_ICON_CATALOG_ENTRIES[alias] !== undefined,
		);
		expect(shadowing).toEqual([]);
	});

	// An alias for what a name or a shorthand already reaches would only be a
	// second place to keep in step.
	it("lists only spellings that resolve to nothing without it", () => {
		const redundant = Object.keys(AZURE_ICON_ALIASES).filter(
			(alias) => withoutAliases.resolveName(alias) !== null,
		);
		expect(redundant).toEqual([]);
	});
});
