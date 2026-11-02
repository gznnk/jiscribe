import { describe, expect, it } from "vitest";

import { createIconSetCatalog } from "../../../schema/iconSet/createIconSetCatalog";
import { createIconSetStencilCategory } from "../createIconSetStencilCategory";
import { createIconSetStencils } from "../createIconSetStencils";
import { toIconSetStencilId } from "../toIconSetStencilId";

const catalog = createIconSetCatalog({
	setLabel: "Test",
	entries: {
		"virtual-machine": {
			label: "Virtual Machine",
			category: "Compute",
			viewBox: "0 0 18 18",
		},
		"key-vault": {
			label: "Key Vault",
			category: "Security",
			viewBox: "0 0 18 18",
		},
	},
	aliases: {},
	palette: [{ icon: "key-vault", label: "Vault" }],
	browseGroups: [
		{ id: "compute", label: "Compute", categories: ["Compute"] },
		{ id: "security", label: "Security", categories: ["Security"] },
	],
	listShorthands: () => [],
});
const drawings = {
	"key-vault": { nodes: [["rect", { width: "1" }]] as const },
};

describe("toIconSetStencilId", () => {
	it("puts the icon name in PascalCase after the prefix", () => {
		expect(toIconSetStencilId("awsIcon", "service/aws-lambda")).toBe(
			"awsIconServiceAwsLambda",
		);
		expect(toIconSetStencilId("azureIcon", "key-vault")).toBe(
			"azureIconKeyVault",
		);
	});
});

describe("createIconSetStencils", () => {
	const stencils = createIconSetStencils({
		objectType: "testIcon",
		stencilIdPrefix: "testIcon",
		catalog,
		drawings,
	});

	it("registers every icon once, the palette first, with its label as the text", () => {
		expect(stencils.map(({ id }) => id)).toEqual([
			"testIconKeyVault",
			"testIconVirtualMachine",
		]);
		expect(stencils[0]).toMatchObject({
			objectType: "testIcon",
			label: "Vault",
			defaultOverrides: { icon: "key-vault", text: "Vault" },
		});
		expect(stencils[1]?.label).toBe("Virtual Machine");
	});

	it("throws on a palette naming an icon the set does not hold", () => {
		const broken = createIconSetCatalog({
			setLabel: "Test",
			entries: {},
			aliases: {},
			palette: [{ icon: "missing", label: "Missing" }],
			browseGroups: [],
			listShorthands: () => [],
		});
		expect(() =>
			createIconSetStencils({
				objectType: "testIcon",
				stencilIdPrefix: "testIcon",
				catalog: broken,
				drawings: {},
			}),
		).toThrow(/"missing"/);
	});
});

describe("createIconSetStencilCategory", () => {
	const category = createIconSetStencilCategory({
		id: "test",
		label: "Test",
		icon: "virtual-machine",
		stencilIdPrefix: "testIcon",
		catalog,
		drawings,
	});

	it("lays the palette out and answers searches with registered ids", () => {
		expect(category.presetIds).toEqual(["testIconKeyVault"]);
		expect(category.search?.("virtual")).toEqual({
			presetIds: ["testIconVirtualMachine"],
			matchCount: 1,
		});
	});

	it("holds every icon in the declared sections", () => {
		expect(category.browseGroups).toEqual([
			{
				id: "compute",
				label: "Compute",
				presetIds: ["testIconVirtualMachine"],
			},
			{ id: "security", label: "Security", presetIds: ["testIconKeyVault"] },
		]);
	});
});
