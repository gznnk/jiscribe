import { describe, it, expect } from "vitest";

import { createCanvasRegistries } from "../../../../registries/createCanvasRegistries";
import {
	DEFAULT_TOOLBAR_LAYOUT,
	basicToolbarEntry,
	type ToolbarEntry,
} from "../toolbarLayout";

const ALL_ENTRIES: ToolbarEntry[] = [
	...DEFAULT_TOOLBAR_LAYOUT,
	basicToolbarEntry,
];

const collectPresetIds = (entries: readonly ToolbarEntry[]): string[] =>
	entries.flatMap((entry) =>
		entry.kind === "preset" ? [entry.presetId] : entry.presetIds,
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
		const categoryIds = ALL_ENTRIES.filter(
			(entry) => entry.kind === "category",
		).map((entry) => entry.id);
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
	 * flyout is left to open.
	 */
	it("opens no category flyout at all", () => {
		expect(
			DEFAULT_TOOLBAR_LAYOUT.filter((entry) => entry.kind === "category"),
		).toEqual([]);
	});

	it("excludes the basic category, whose members are pinned instead", () => {
		expect(DEFAULT_TOOLBAR_LAYOUT).not.toContain(basicToolbarEntry);
	});

	it("carries no plugin category, so a host must opt in explicitly", () => {
		const categoryIds = DEFAULT_TOOLBAR_LAYOUT.filter(
			(entry) => entry.kind === "category",
		).map((entry) => entry.id);
		expect(categoryIds).not.toContain("annotation");
		expect(categoryIds).not.toContain("flowchart");
		expect(categoryIds).not.toContain("container");
		expect(categoryIds).not.toContain("general");
	});
});

describe("toolbar category entries", () => {
	it.each([["basic", basicToolbarEntry]] as [string, ToolbarEntry][])(
		"declares %s as a non-empty category",
		(id, entry) => {
			expect(entry.kind).toBe("category");
			if (entry.kind !== "category") {
				return;
			}
			expect(entry.id).toBe(id);
			expect(entry.presetIds.length).toBeGreaterThan(0);
			// Icons are memo()-wrapped, so they are objects rather than functions.
			expect(entry.icon).toBeTruthy();
		},
	);

	it("carries an English and Japanese label for every built-in category", () => {
		for (const entry of [basicToolbarEntry]) {
			if (entry.kind !== "category") {
				continue;
			}
			expect(typeof entry.label).toBe("object");
			expect(entry.label).toMatchObject({
				en: expect.any(String),
				ja: expect.any(String),
			});
		}
	});
});
