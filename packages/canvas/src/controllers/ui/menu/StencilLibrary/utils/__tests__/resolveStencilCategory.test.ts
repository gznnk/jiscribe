import { describe, expect, it } from "vitest";

import { RectIcon } from "../../../../objects/primitives/RectIcon";
import type { Stencil } from "../../../../objects/Stencil";
import type { StencilCategory } from "../../../../objects/StencilCategory";
import { createStencilRegistry } from "../../../../objects/StencilRegistry";
import {
	resolveStencilCategories,
	resolveStencilCategory,
} from "../resolveStencilCategory";

const makeStencil = (id: string): Stencil => ({
	id,
	objectType: "rect",
	label: id,
	icon: RectIcon,
});

/** A registry holding exactly `ids`, so an id outside the list resolves to nothing. */
const registryWith = (...ids: string[]) => {
	const stencil = createStencilRegistry();
	for (const id of ids) {
		stencil.register(makeStencil(id));
	}
	return stencil;
};

const makeCategory = (id: string, presetIds: string[]): StencilCategory => ({
	id,
	label: id,
	icon: RectIcon,
	presetIds,
});

describe("resolveStencilCategory", () => {
	it("resolves the presets in the declared order, not the registration order", () => {
		const resolved = resolveStencilCategory(
			makeCategory("basic", ["ellipse", "rect"]),
			registryWith("rect", "ellipse"),
		);

		expect(resolved?.presets.map((preset) => preset.id)).toEqual([
			"ellipse",
			"rect",
		]);
		expect(resolved?.category.id).toBe("basic");
	});

	it("skips an id no plugin registered", () => {
		const resolved = resolveStencilCategory(
			makeCategory("basic", ["rect", "process"]),
			registryWith("rect"),
		);

		expect(resolved?.presets.map((preset) => preset.id)).toEqual(["rect"]);
	});

	it("returns null when nothing resolved, so the caller can drop the group", () => {
		expect(
			resolveStencilCategory(
				makeCategory("flowchart", ["process"]),
				registryWith("rect"),
			),
		).toBeNull();
	});

	it("throws naming the id a category lists twice", () => {
		expect(() =>
			resolveStencilCategory(
				makeCategory("basic", ["rect", "ellipse", "rect"]),
				registryWith("rect", "ellipse"),
			),
		).toThrow(/"rect" twice/);
	});

	it("throws on a repeated id even when no plugin registered it", () => {
		// The declaration is wrong either way, and which plugins a host applied
		// must not decide whether the mistake is heard.
		expect(() =>
			resolveStencilCategory(
				makeCategory("flowchart", ["process", "process"]),
				registryWith("rect"),
			),
		).toThrow(/"process" twice/);
	});
});

describe("resolveStencilCategory browseGroups", () => {
	const withGroups = (
		groups: { id: string; presetIds: string[] }[],
		presetIds = ["rect"],
	): StencilCategory => ({
		...makeCategory("aws", presetIds),
		browseGroups: groups.map((group) => ({ ...group, label: group.id })),
	});

	it("resolves each group in the declared order, dropping unknown ids and empty groups", () => {
		const resolved = resolveStencilCategory(
			withGroups([
				{ id: "compute", presetIds: ["ellipse", "process", "rect"] },
				{ id: "storage", presetIds: ["process"] },
				{ id: "general", presetIds: ["rect"] },
			]),
			registryWith("rect", "ellipse"),
		);

		expect(
			resolved?.browseGroups.map(({ group, presets }) => [
				group.id,
				presets.map((preset) => preset.id),
			]),
		).toEqual([
			["compute", ["ellipse", "rect"]],
			["general", ["rect"]],
		]);
	});

	it("has none when the category declares none or none resolves", () => {
		expect(
			resolveStencilCategory(
				makeCategory("basic", ["rect"]),
				registryWith("rect"),
			)?.browseGroups,
		).toEqual([]);
		expect(
			resolveStencilCategory(
				withGroups([{ id: "compute", presetIds: ["process"] }]),
				registryWith("rect"),
			)?.browseGroups,
		).toEqual([]);
	});

	it("still drops the category when its presetIds resolve nothing", () => {
		expect(
			resolveStencilCategory(
				withGroups([{ id: "compute", presetIds: ["rect"] }], ["process"]),
				registryWith("rect"),
			),
		).toBeNull();
	});

	it("throws naming the group id used twice", () => {
		expect(() =>
			resolveStencilCategory(
				withGroups([
					{ id: "compute", presetIds: ["rect"] },
					{ id: "compute", presetIds: ["process"] },
				]),
				registryWith("rect"),
			),
		).toThrow(/browse group id "compute" twice/);
	});

	it("throws naming the preset id a group lists twice, even unregistered", () => {
		expect(() =>
			resolveStencilCategory(
				withGroups([{ id: "compute", presetIds: ["process", "process"] }]),
				registryWith("rect"),
			),
		).toThrow(/"process" twice/);
	});

	it("lets two groups list the same preset", () => {
		const resolved = resolveStencilCategory(
			withGroups([
				{ id: "compute", presetIds: ["rect"] },
				{ id: "general", presetIds: ["rect"] },
			]),
			registryWith("rect"),
		);

		expect(resolved?.browseGroups).toHaveLength(2);
	});
});

describe("resolveStencilCategories", () => {
	it("keeps the declared order and drops the groups left empty", () => {
		const resolved = resolveStencilCategories(
			[
				makeCategory("flowchart", ["process"]),
				makeCategory("basic", ["rect", "ellipse"]),
			],
			registryWith("rect", "ellipse"),
		);

		expect(resolved.map((section) => section.category.id)).toEqual(["basic"]);
	});

	it("returns nothing when no group resolves", () => {
		expect(
			resolveStencilCategories(
				[makeCategory("flowchart", ["process"])],
				registryWith("rect"),
			),
		).toEqual([]);
	});

	it("throws naming the id two sections share", () => {
		expect(() =>
			resolveStencilCategories(
				[makeCategory("basic", ["rect"]), makeCategory("basic", ["ellipse"])],
				registryWith("rect", "ellipse"),
			),
		).toThrow(/"basic"/);
	});

	it("throws on a duplicate section id before any of them resolves", () => {
		// The check runs over the declaration, so an id shared by two sections that
		// would both have been dropped is still refused.
		expect(() =>
			resolveStencilCategories(
				[
					makeCategory("flowchart", ["process"]),
					makeCategory("flowchart", ["decision"]),
				],
				registryWith("rect"),
			),
		).toThrow(/"flowchart"/);
	});
});
