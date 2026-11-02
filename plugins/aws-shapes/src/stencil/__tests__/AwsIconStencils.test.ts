import { toIconSetStencilId } from "@jiscribe/canvas-sdk";
import { describe, expect, it } from "vitest";

import { AWS_ICON_CATALOG_ENTRIES } from "../../schema/icon/iconCatalog.generated";
import { AWS_TIER1_ICONS } from "../../schema/icon/tier1Icons";
import { awsStencilCategory } from "../AwsIconStencilCategory";
import { AWS_ICON_STENCIL_IDS, AwsIconStencils } from "../AwsIconStencils";

const toAwsPresetId = (icon: string): string =>
	toIconSetStencilId("awsIcon", icon);

const search = awsStencilCategory.search;
const registeredIds = new Set(AwsIconStencils.map((stencil) => stencil.id));

describe("AwsIconStencils", () => {
	it("registers every icon in the set under its own id", () => {
		expect(AwsIconStencils).toHaveLength(
			Object.keys(AWS_ICON_CATALOG_ENTRIES).length,
		);
		expect(registeredIds.size).toBe(AwsIconStencils.length);
	});

	it("keeps the palette to tier 1, in tier 1's order", () => {
		expect(AWS_ICON_STENCIL_IDS).toEqual(
			AWS_TIER1_ICONS.map(({ icon }) => toAwsPresetId(icon)),
		);
		expect(AWS_ICON_STENCIL_IDS).toHaveLength(102);
		expect(AWS_ICON_STENCIL_IDS[1]).toBe("awsIconServiceAwsLambda");
		expect(awsStencilCategory.presetIds).toEqual(AWS_ICON_STENCIL_IDS);
	});

	it("labels a tier 1 icon with its short name and the rest with the asset's", () => {
		const lambda = AwsIconStencils.find(
			(stencil) => stencil.id === "awsIconServiceAwsLambda",
		);
		expect(lambda?.label).toBe("Lambda");
		expect(lambda?.defaultOverrides).toEqual({
			icon: "service/aws-lambda",
			text: "Lambda",
		});

		const outsideTier1 = Object.keys(AWS_ICON_CATALOG_ENTRIES).find(
			(name) => !AWS_TIER1_ICONS.some(({ icon }) => icon === name),
		)!;
		const stencil = AwsIconStencils.find(
			(candidate) => candidate.id === toAwsPresetId(outsideTier1),
		);
		expect(stencil?.label).toBe(AWS_ICON_CATALOG_ENTRIES[outsideTier1]?.label);
	});
});

describe("awsStencilCategory.search", () => {
	it("ranks the service itself first and answers with registered ids", () => {
		const result = search!("lambda");

		expect(result.presetIds[0]).toBe("awsIconServiceAwsLambda");
		for (const id of result.presetIds) {
			expect(registeredIds).toContain(id);
		}
	});

	// Two icons outside Compute carry "compute" in their own names, so the
	// count is the category plus those
	it("lists a whole AWS category for its name", () => {
		const computeIds = Object.entries(AWS_ICON_CATALOG_ENTRIES)
			.filter(([, entry]) => entry.category === "Compute")
			.map(([name]) => toAwsPresetId(name));
		const result = search!("compute");

		expect(computeIds.length).toBeGreaterThan(0);
		expect(result.presetIds).toEqual(expect.arrayContaining(computeIds));
		expect(result.matchCount).toBe(result.presetIds.length);
		expect(result.matchCount).toBeGreaterThanOrEqual(computeIds.length);
	});
});

describe("awsStencilCategory.browseGroups", () => {
	const browseGroups = awsStencilCategory.browseGroups ?? [];

	it("lays every registered icon out in a section, each once, Compute first", () => {
		expect(browseGroups[0]?.id).toBe("compute");
		const presetIds = browseGroups.flatMap((group) => group.presetIds);

		expect(new Set(presetIds)).toEqual(registeredIds);
		expect(presetIds).toHaveLength(registeredIds.size);
	});

	it("leaves the section labels untranslated", () => {
		expect(browseGroups.map((group) => typeof group.label)).not.toContain(
			"object",
		);
	});
});
