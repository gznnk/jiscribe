import { describe, expect, it, vi } from "vitest";

import { RectIcon } from "../../../../objects/primitives/RectIcon";
import type { Stencil } from "../../../../objects/Stencil";
import type {
	StencilCategory,
	StencilCategorySearch,
} from "../../../../objects/StencilCategory";
import { createStencilRegistry } from "../../../../objects/StencilRegistry";
import type { ResolvedStencilCategory } from "../resolveStencilCategory";
import { searchStencilLibrary } from "../searchStencilLibrary";

const makeStencil = (id: string, label = id): Stencil => ({
	id,
	objectType: "rect",
	label,
	icon: RectIcon,
});

/** A registry holding exactly `stencils`, so any other id resolves to nothing. */
const registryWith = (...stencils: Stencil[]) => {
	const stencil = createStencilRegistry();
	for (const preset of stencils) {
		stencil.register(preset);
	}
	return stencil;
};

const makeSection = (
	id: string,
	listed: Stencil[],
	search?: StencilCategorySearch,
): ResolvedStencilCategory => {
	const category: StencilCategory = {
		id,
		label: id,
		icon: RectIcon,
		presetIds: listed.map((preset) => preset.id),
		search,
	};
	return { category, presets: listed };
};

/** A search answering the same ids for any query, as cut from `matchCount` matches. */
const answering =
	(presetIds: string[], matchCount = presetIds.length): StencilCategorySearch =>
	() => ({ presetIds, matchCount });

const resolveLabel = (preset: Stencil) => preset.label as string;

const idsOf = (presets: Stencil[]) => presets.map((preset) => preset.id);

describe("searchStencilLibrary", () => {
	it("matches the listed labels case-insensitively when a category has no search", () => {
		const rect = makeStencil("rect", "Rectangle");
		const ellipse = makeStencil("ellipse", "Ellipse");
		const registry = registryWith(rect, ellipse);

		const result = searchStencilLibrary(
			[makeSection("basic", [rect, ellipse])],
			"RECT",
			resolveLabel,
			(id) => registry.get(id),
		);

		expect(idsOf(result.presets)).toEqual(["rect"]);
		expect(result.hiddenMatchCount).toBe(0);
	});

	it("adds the presets a search answers after the section's label matches", () => {
		const lambdaListed = makeStencil("lambda", "Lambda");
		const lambdaEdge = makeStencil("lambda-edge", "Lambda@Edge");
		const registry = registryWith(lambdaListed, lambdaEdge);

		const result = searchStencilLibrary(
			[makeSection("aws", [lambdaListed], answering(["lambda-edge"]))],
			"lambda",
			resolveLabel,
			(id) => registry.get(id),
		);

		expect(idsOf(result.presets)).toEqual(["lambda", "lambda-edge"]);
	});

	it("passes the trimmed query to the search as is", () => {
		const find = vi.fn(() => ({ presetIds: [], matchCount: 0 }));

		searchStencilLibrary(
			[makeSection("aws", [], find)],
			"Api Gateway",
			resolveLabel,
			() => undefined,
		);

		expect(find).toHaveBeenCalledWith("Api Gateway");
	});

	it("keeps an id once when both the label and the search find it", () => {
		const tile = makeStencil("tile", "Tile");
		const registry = registryWith(tile);

		const result = searchStencilLibrary(
			[
				makeSection("first", [tile], answering(["tile"])),
				makeSection("second", [], answering(["tile"])),
			],
			"tile",
			resolveLabel,
			(id) => registry.get(id),
		);

		expect(idsOf(result.presets)).toEqual(["tile"]);
	});

	it("keeps the section order across label matches and search answers", () => {
		const tile = makeStencil("tile", "Tile");
		const brick = makeStencil("brick", "Brick");
		const rect = makeStencil("rect", "Rect tile");
		const registry = registryWith(tile, brick, rect);

		const result = searchStencilLibrary(
			[
				makeSection("spec", [tile], answering(["brick"])),
				makeSection("basic", [rect]),
			],
			"tile",
			resolveLabel,
			(id) => registry.get(id),
		);

		expect(idsOf(result.presets)).toEqual(["tile", "brick", "rect"]);
	});

	it("drops an id the registry does not know", () => {
		const lambda = makeStencil("lambda", "Lambda");
		const registry = registryWith(lambda);

		const result = searchStencilLibrary(
			[makeSection("aws", [], answering(["unknown", "lambda"]))],
			"lambda",
			resolveLabel,
			(id) => registry.get(id),
		);

		expect(idsOf(result.presets)).toEqual(["lambda"]);
	});

	it("sums what every category cut off", () => {
		const registry = registryWith(makeStencil("a"), makeStencil("b"));

		const result = searchStencilLibrary(
			[
				makeSection("aws", [], answering(["a"], 30)),
				makeSection("lucide", [], answering(["b"], 5)),
				makeSection("uncut", [], answering([], 0)),
			],
			"x",
			resolveLabel,
			(id) => registry.get(id),
		);

		expect(result.hiddenMatchCount).toBe(29 + 4);
	});

	it("matches nothing and asks no search for an empty query", () => {
		const find = vi.fn(() => ({ presetIds: [], matchCount: 0 }));

		const result = searchStencilLibrary(
			[makeSection("aws", [makeStencil("a")], find)],
			"",
			resolveLabel,
			() => undefined,
		);

		expect(result).toEqual({ presets: [], hiddenMatchCount: 0 });
		expect(find).not.toHaveBeenCalled();
	});
});
