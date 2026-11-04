import { describe, expect, it } from "vitest";

import { createIconSetCatalog } from "../createIconSetCatalog";
import type { IconSetCatalogEntry } from "../IconSetTypes";

type TestEntry = IconSetCatalogEntry & { size: string };

const entry = (label: string, category: string): TestEntry => ({
	label,
	category,
	viewBox: "0 0 18 18",
	size: "18",
});

/** A small set: two names sharing the shorthand `storage`, one alias. */
const catalog = createIconSetCatalog<TestEntry>({
	setLabel: "Test",
	entries: {
		"virtual-machine": entry("Virtual Machine", "Compute"),
		"azure-storage": entry("Azure Storage", "Storage"),
		"microsoft-storage": entry("Microsoft Storage", "Storage"),
		"azure-functions": entry("Azure Functions", "Compute"),
		"key-vault": entry("Key Vault", "Security"),
	},
	aliases: { vm: "virtual-machine", kv: "key-vault" },
	palette: [
		{ icon: "azure-functions", label: "Functions" },
		{ icon: "virtual-machine", label: "VM" },
	],
	browseGroups: [
		{ id: "compute", label: "Compute", categories: ["Compute"] },
		{ id: "rest", label: "Rest", categories: ["Storage", "Security"] },
	],
	listShorthands: (name) =>
		["azure-", "microsoft-"]
			.filter((prefix) => name.startsWith(prefix))
			.map((prefix) => name.slice(prefix.length)),
});

/** A one-category skeleton the cases needing names of their own build on. */
const analyticsSetBase = {
	setLabel: "Test",
	entries: {} as Record<string, TestEntry>,
	aliases: {} as Record<string, string>,
	palette: [],
	browseGroups: [
		{ id: "analytics", label: "Analytics", categories: ["Analytics"] },
	],
	listShorthands: (): string[] => [],
};

const validate = (icon: unknown) =>
	catalog.validateIconName({ icon } as never, "root[2]");

describe("createIconSetCatalog: resolveName", () => {
	it("passes a canonical name through and follows an alias", () => {
		expect(catalog.resolveName("key-vault")).toBe("key-vault");
		expect(catalog.resolveName("vm")).toBe("virtual-machine");
	});

	it("resolves a shorthand only one name derives", () => {
		expect(catalog.resolveName("functions")).toBe("azure-functions");
	});

	// Two names derive `storage`; picking one would be a guess.
	it("resolves a shorthand two names derive to nothing", () => {
		expect(catalog.resolveName("storage")).toBeNull();
	});

	it("resolves a spelling variant after normalizing it", () => {
		expect(catalog.resolveName("KeyVault")).toBe("key-vault");
		expect(catalog.resolveName("VM")).toBe("virtual-machine");
	});

	it("does not mistake a name of Object.prototype for an icon", () => {
		expect(catalog.resolveName("constructor")).toBeNull();
		expect(catalog.isKnownName("hasOwnProperty")).toBe(false);
		expect(catalog.resolveName("toString")).toBeNull();
	});

	it("resolves a name that normalizes to nothing to nothing", () => {
		expect(catalog.resolveName("&")).toBeNull();
		expect(catalog.resolveName("ストレージ")).toBeNull();
	});
});

describe("createIconSetCatalog: resolveName by the joined spelling", () => {
	it("reaches a canonical name, an alias and a shorthand", () => {
		expect(catalog.resolveName("Keyvault")).toBe("key-vault");
		expect(catalog.resolveName("v-m")).toBe("virtual-machine");
		expect(catalog.resolveName("Func-tions")).toBe("azure-functions");
	});

	// What a caller writes when it kebab-cases a camel-case name itself;
	// normalizing leaves it unchanged.
	it("reaches the last round from an already kebab-case spelling", () => {
		expect(catalog.resolveName("virtual-mach-ine")).toBe("virtual-machine");
		expect(catalog.resolveName("azure/storage")).toBe("azure-storage");
	});

	it("still answers a canonical name as written", () => {
		const joinable = createIconSetCatalog<TestEntry>({
			...analyticsSetBase,
			entries: {
				bigquery: entry("BigQuery", "Analytics"),
				"big-query": entry("Big Query", "Analytics"),
			},
		});
		expect(joinable.resolveName("big-query")).toBe("big-query");
		expect(joinable.resolveName("bigquery")).toBe("bigquery");
	});

	it("resolves a joined spelling two names share to nothing", () => {
		const shared = createIconSetCatalog<TestEntry>({
			...analyticsSetBase,
			entries: {
				"multi-factor-auth": entry("Multi-Factor Auth", "Analytics"),
				"multifactor-auth": entry("Multifactor Auth", "Analytics"),
			},
		});
		expect(shared.resolveName("Multi Factorauth")).toBeNull();
	});

	it("resolves a joined spelling an alias and a shorthand claim for different names to nothing", () => {
		const claimed = createIconSetCatalog<TestEntry>({
			...analyticsSetBase,
			entries: {
				"azure-dev-box": entry("Azure Dev Box", "Analytics"),
				"dev-tools": entry("Dev Tools", "Analytics"),
			},
			aliases: { devbox: "dev-tools" },
			listShorthands: (name) =>
				name.startsWith("azure-") ? [name.slice("azure-".length)] : [],
		});
		// The alias `devbox` and the shorthand `dev-box` both join to `devbox`.
		expect(claimed.resolveName("De Vbox")).toBeNull();
	});

	it("resolves a joined spelling an alias and a shorthand claim for the same name to it", () => {
		const agreeing = createIconSetCatalog<TestEntry>({
			...analyticsSetBase,
			entries: {
				"azure-dev-box": entry("Azure Dev Box", "Analytics"),
			},
			aliases: { devbox: "azure-dev-box" },
			listShorthands: (name) =>
				name.startsWith("azure-") ? [name.slice("azure-".length)] : [],
		});
		// The alias `devbox` and the shorthand `dev-box` both join to `devbox`.
		expect(agreeing.resolveName("De Vbox")).toBe("azure-dev-box");
	});

	it("lets a canonical name's joined spelling win over an alias's", () => {
		const outranked = createIconSetCatalog<TestEntry>({
			...analyticsSetBase,
			entries: {
				"data-lake": entry("Data Lake", "Analytics"),
				warehouse: entry("Warehouse", "Analytics"),
			},
			aliases: { "data-lak-e": "warehouse" },
		});
		expect(outranked.resolveName("Datalake")).toBe("data-lake");
	});
});

describe("createIconSetCatalog: entries and labels", () => {
	it("answers with the set's own entry type, extra fields included", () => {
		expect(catalog.readEntry("vm")?.size).toBe("18");
		expect(catalog.readEntry("nothing")).toBeNull();
	});

	it("labels with the palette's name first, else the entry's", () => {
		expect(catalog.readLabel("functions")).toBe("Functions");
		expect(catalog.readLabel("kv")).toBe("Key Vault");
		expect(catalog.readLabel("nothing")).toBeNull();
	});

	it("lists the names, the categories and the palette", () => {
		expect(catalog.names).toHaveLength(5);
		expect(catalog.categories).toEqual(["Compute", "Security", "Storage"]);
		expect(catalog.paletteNames).toEqual([
			"azure-functions",
			"virtual-machine",
		]);
	});
});

describe("createIconSetCatalog: search and browse", () => {
	it("answers an empty term with the palette", () => {
		expect(catalog.search("")).toEqual({
			names: ["azure-functions", "virtual-machine"],
			total: 2,
		});
	});

	// A term in Japanese, say, must not list the whole palette as matches.
	it("matches nothing for a term that normalizes to nothing", () => {
		expect(catalog.search("&")).toEqual({ names: [], total: 0 });
		expect(catalog.search("---")).toEqual({ names: [], total: 0 });
	});

	it("matches the category and the aliases", () => {
		expect(catalog.search("storage").names).toEqual([
			"azure-storage",
			"microsoft-storage",
		]);
		expect(catalog.search("kv").names).toEqual(["key-vault"]);
	});

	it("puts the palette first within a section", () => {
		expect(catalog.listBrowseGroups()).toEqual([
			{
				id: "compute",
				label: "Compute",
				names: ["azure-functions", "virtual-machine"],
			},
			{
				id: "rest",
				label: "Rest",
				names: ["azure-storage", "key-vault", "microsoft-storage"],
			},
		]);
	});
});

describe("createIconSetCatalog: validateIconName", () => {
	it("names the set in the message, with candidates where there are some", () => {
		expect(validate("key-vaul")).toEqual([
			{
				path: "root[2].icon",
				message: 'unknown Test icon "key-vaul" — did you mean "key-vault"?',
				severity: "error",
				beyondSchema: true,
			},
		]);
		expect(validate("qqqqzzzzxxxx")[0]?.message).toBe(
			'unknown Test icon "qqqqzzzzxxxx" (see the icon list in the AI reference)',
		);
	});

	it("rejects a non-string and accepts an absent icon", () => {
		expect(validate(3)[0]?.message).toBe("must be a string");
		expect(validate(undefined)).toEqual([]);
		expect(validate("storage")).toHaveLength(1);
	});
});

describe("createIconSetCatalog: the tables' consistency", () => {
	const base = {
		setLabel: "Test",
		entries: { "key-vault": entry("Key Vault", "Security") },
		aliases: {},
		palette: [],
		browseGroups: [
			{ id: "security", label: "Security", categories: ["Security"] },
		],
		listShorthands: () => [],
	};

	it("throws on an alias pointing at a name the catalog does not hold", () => {
		expect(() =>
			createIconSetCatalog({ ...base, aliases: { kv: "key-vaults" } }),
		).toThrow(
			'Test icon set: the alias "kv" points at "key-vaults", which the catalog does not hold',
		);
	});

	it("throws on a category no browse group holds", () => {
		expect(() =>
			createIconSetCatalog({
				...base,
				entries: { ...base.entries, vm: entry("VM", "Compute") },
			}),
		).toThrow(
			'Test icon set: the category "Compute" (of "vm") is in no browse group',
		);
	});

	it("accepts consistent tables", () => {
		expect(() => createIconSetCatalog(base)).not.toThrow();
	});
});
