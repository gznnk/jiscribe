import { describe, expect, it } from "vitest";

import { createCanvasRegistries } from "../../../../../registries/createCanvasRegistries";
import { RectIcon } from "../../../../objects/primitives/RectIcon";
import {
	basicStencilCategory,
	type StencilCategory,
} from "../../../../objects/StencilCategory";
import { resolveStencilCategories } from "../../../StencilLibrary/utils/resolveStencilCategory";
import { DEFAULT_RAIL_PRESET_IDS } from "../../stencilRailConfig";
import { resolveStencilRail } from "../resolveStencilRail";

const { stencil } = createCanvasRegistries();

/** A second section, so the pins have an order to keep. */
const lineCategory: StencilCategory = {
	id: "lines",
	label: "Lines",
	icon: RectIcon,
	presetIds: ["polyline", "polygon"],
};

/** A section none of whose presets is registered: resolved away. */
const emptyCategory: StencilCategory = {
	id: "empty",
	label: "Empty",
	icon: RectIcon,
	presetIds: ["no-such-preset"],
};

const librarySections = resolveStencilCategories(
	[basicStencilCategory, lineCategory, emptyCategory],
	stencil,
);

describe("resolveStencilRail", () => {
	it("resolves the presets in declared order, dropping ids nothing registers", () => {
		const rail = resolveStencilRail(
			["text", "no-such-preset", "rect"],
			[],
			librarySections,
			stencil,
		);
		expect(rail.presets.map((preset) => preset.id)).toEqual(["text", "rect"]);
	});

	it("shows the pinned categories in pin order, not library order", () => {
		const rail = resolveStencilRail(
			[],
			["lines", "basic"],
			librarySections,
			stencil,
		);
		expect(rail.pinnedCategories.map(({ category }) => category.id)).toEqual([
			"lines",
			"basic",
		]);
		// Each as the library resolved it, presets and all.
		expect(rail.pinnedCategories[0]).toBe(librarySections[1]);
	});

	/**
	 * A pin naming a section the library does not hold — a plugin this host does
	 * not apply, or one whose presets all went missing — stays in the state; the
	 * rail just does not draw it.
	 */
	it("leaves off a pin naming no resolved section", () => {
		const rail = resolveStencilRail(
			[],
			["no-such-category", "basic", "empty"],
			librarySections,
			stencil,
		);
		expect(rail.pinnedCategories.map(({ category }) => category.id)).toEqual([
			"basic",
		]);
	});

	it("offers the catalog only with a library", () => {
		expect(
			resolveStencilRail([], [], librarySections, stencil).hasCatalog,
		).toBe(true);
		expect(resolveStencilRail(["rect"], [], [], stencil).hasCatalog).toBe(
			false,
		);
	});

	it("draws no pinned category without a library, whatever is pinned", () => {
		const rail = resolveStencilRail(["rect"], ["basic"], [], stencil);
		expect(rail.presets.map((preset) => preset.id)).toEqual(["rect"]);
		expect(rail.pinnedCategories).toEqual([]);
	});

	/** The id keys the button, so a twin would be indistinguishable, not wrong. */
	it("throws when a preset id is listed twice", () => {
		expect(() =>
			resolveStencilRail(["rect", "ellipse", "rect"], [], [], stencil),
		).toThrow(/"rect" twice/);
	});
});

describe("DEFAULT_RAIL_PRESET_IDS", () => {
	it("is core's primitives, area → line → text", () => {
		expect(DEFAULT_RAIL_PRESET_IDS).toEqual([
			"rect",
			"ellipse",
			"polygon",
			"polyline",
			"text",
		]);
	});

	/** An unregistered id would only show up as a missing button. */
	it("names only presets the default registries register", () => {
		expect(
			DEFAULT_RAIL_PRESET_IDS.filter((presetId) => !stencil.get(presetId)),
		).toEqual([]);
	});
});
