import { describe, it, expect } from "vitest";

import { createCanvasRegistries } from "../../../../registries/createCanvasRegistries";
import {
	basicStencilCategory,
	type StencilCategory,
} from "../../../objects/StencilCategory";
import { DEFAULT_TOOLBAR_LAYOUT, type ToolbarEntry } from "../toolbarLayout";

const ALL_ENTRIES: ToolbarEntry[] = [
	...DEFAULT_TOOLBAR_LAYOUT,
	{ kind: "category", category: basicStencilCategory },
];

const collectPresetIds = (entries: readonly ToolbarEntry[]): string[] =>
	entries.flatMap((entry) =>
		entry.kind === "preset" ? [entry.presetId] : entry.category.presetIds,
	);

describe("DEFAULT_TOOLBAR_LAYOUT", () => {
	/**
	 * A presetId naming no registered preset is silently skipped at render time,
	 * so a typo or a removed stencil would only show up as a missing button.
	 */
	it("names only presets the default registries actually register", () => {
		const { stencil } = createCanvasRegistries();
		const unresolved = collectPresetIds(ALL_ENTRIES).filter(
			(presetId) => stencil.get(presetId) === undefined,
		);
		expect(unresolved).toEqual([]);
	});

	it("lists no preset twice within a single entry", () => {
		for (const entry of ALL_ENTRIES) {
			const presetIds = collectPresetIds([entry]);
			expect(presetIds).toHaveLength(new Set(presetIds).size);
		}
	});

	it("reaches every preset exactly once", () => {
		const presetIds = collectPresetIds(DEFAULT_TOOLBAR_LAYOUT);
		expect(presetIds).toHaveLength(new Set(presetIds).size);
	});

	it("gives every category a unique id", () => {
		const categoryIds = ALL_ENTRIES.flatMap((entry) =>
			entry.kind === "category" ? [entry.category.id] : [],
		);
		expect(categoryIds).toHaveLength(new Set(categoryIds).size);
	});

	it("pins every core preset directly on the bar", () => {
		const pinned = DEFAULT_TOOLBAR_LAYOUT.filter(
			(entry) => entry.kind === "preset",
		).map((entry) => entry.presetId);
		expect(pinned).toEqual(["rect", "ellipse", "polyline", "polygon", "text"]);
	});

	/**
	 * Core owns nothing but the basic primitives, and every one is pinned, so no
	 * flyout is left to open (the basic category is for hosts that want one).
	 */
	it("opens no category flyout at all", () => {
		expect(
			DEFAULT_TOOLBAR_LAYOUT.filter((entry) => entry.kind === "category"),
		).toEqual([]);
	});
});

describe("basicStencilCategory", () => {
	it.each([["basic", basicStencilCategory]] as [string, StencilCategory][])(
		"declares %s as a non-empty category",
		(id, category) => {
			expect(category.id).toBe(id);
			expect(category.presetIds.length).toBeGreaterThan(0);
			// Icons are memo()-wrapped, so they are objects rather than functions.
			expect(category.icon).toBeTruthy();
		},
	);

	it("carries an English and Japanese label", () => {
		expect(typeof basicStencilCategory.label).toBe("object");
		expect(basicStencilCategory.label).toMatchObject({
			en: expect.any(String),
			ja: expect.any(String),
		});
	});
});
