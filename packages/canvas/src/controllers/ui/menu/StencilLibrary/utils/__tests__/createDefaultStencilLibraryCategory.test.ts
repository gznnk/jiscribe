import { describe, expect, it } from "vitest";

import { createTestRegistries } from "../../../../../registries/createCanvasRegistries";
import { RectIcon } from "../../../../objects/primitives/RectIcon";
import type { Stencil } from "../../../../objects/Stencil";
import { createStencilRegistry } from "../../../../objects/StencilRegistry";
import {
	createDefaultStencilLibraryCategory,
	DEFAULT_STENCIL_LIBRARY_CATEGORY_ID,
	DEFAULT_STENCIL_LIBRARY_LISTED_COUNT,
	DEFAULT_STENCIL_LIBRARY_SEARCH_CAP,
} from "../createDefaultStencilLibraryCategory";
import { resolveStencilCategories } from "../resolveStencilCategory";

const makeStencil = (id: string, label = id): Stencil => ({
	id,
	objectType: "rect",
	label,
	icon: RectIcon,
});

const labelOf = (preset: Stencil): string =>
	typeof preset.label === "string" ? preset.label : preset.label.en;

/** A registry holding `count` presets named `preset-0`, `preset-1`, … in that order. */
const registryOf = (count: number) => {
	const stencil = createStencilRegistry();
	for (let index = 0; index < count; index++) {
		stencil.register(makeStencil(`preset-${index}`));
	}
	return stencil;
};

describe("createDefaultStencilLibraryCategory", () => {
	it("lists every registered preset in registration order, under the given heading, when they fit", () => {
		const stencil = createStencilRegistry();
		for (const id of ["ellipse", "rect", "text"]) {
			stencil.register(makeStencil(id));
		}

		const category = createDefaultStencilLibraryCategory(
			stencil,
			"All shapes",
			labelOf,
		);
		expect(category).toMatchObject({
			id: DEFAULT_STENCIL_LIBRARY_CATEGORY_ID,
			label: "All shapes",
			icon: RectIcon,
			presetIds: ["ellipse", "rect", "text"],
		});
	});

	/** An icon set registers thousands; the sidebar draws every listed one. */
	it("lists only the first presets in registration order, up to the cap", () => {
		const category = createDefaultStencilLibraryCategory(
			registryOf(DEFAULT_STENCIL_LIBRARY_LISTED_COUNT + 10),
			"All",
			labelOf,
		);
		expect(category.presetIds).toHaveLength(
			DEFAULT_STENCIL_LIBRARY_LISTED_COUNT,
		);
		expect(category.presetIds[0]).toBe("preset-0");
		expect(category.presetIds.at(-1)).toBe(
			`preset-${DEFAULT_STENCIL_LIBRARY_LISTED_COUNT - 1}`,
		);
	});

	it("reaches a preset beyond the listed ones through its search, by display label", () => {
		const stencil = registryOf(DEFAULT_STENCIL_LIBRARY_LISTED_COUNT);
		stencil.register(makeStencil("late", "Far Away Shape"));
		const category = createDefaultStencilLibraryCategory(
			stencil,
			"All",
			labelOf,
		);

		expect(category.presetIds).not.toContain("late");
		expect(category.search?.("away shape")).toEqual({
			presetIds: ["late"],
			matchCount: 1,
		});
	});

	it("cuts its search to the cap and reports how many matched", () => {
		const total = DEFAULT_STENCIL_LIBRARY_SEARCH_CAP + 5;
		const category = createDefaultStencilLibraryCategory(
			registryOf(total),
			"All",
			labelOf,
		);

		const found = category.search?.("preset");
		expect(found?.presetIds).toHaveLength(DEFAULT_STENCIL_LIBRARY_SEARCH_CAP);
		expect(found?.matchCount).toBe(total);
	});

	/** Listed twice, the section would throw on resolution. */
	it("lists a preset id registered twice once, at its first position, resolving to the last registration", () => {
		const stencil = createStencilRegistry();
		stencil.register(makeStencil("rect", "first"));
		stencil.register(makeStencil("ellipse"));
		stencil.register(makeStencil("rect", "second"));

		const category = createDefaultStencilLibraryCategory(
			stencil,
			"All",
			labelOf,
		);
		expect(category.presetIds).toEqual(["rect", "ellipse"]);
		const [resolved] = resolveStencilCategories([category], stencil);
		expect(resolved.presets.map((preset) => preset.label)).toEqual([
			"second",
			"ellipse",
		]);
	});

	it("resolves to no section over an empty registry", () => {
		const stencil = createStencilRegistry();
		expect(
			resolveStencilCategories(
				[createDefaultStencilLibraryCategory(stencil, "All", labelOf)],
				stencil,
			),
		).toEqual([]);
	});

	it("holds core's presets on a canvas with the default registries", () => {
		const { stencil } = createTestRegistries();
		expect(
			createDefaultStencilLibraryCategory(stencil, "All", labelOf).presetIds,
		).toEqual(expect.arrayContaining(["rect", "ellipse", "text"]));
	});
});
