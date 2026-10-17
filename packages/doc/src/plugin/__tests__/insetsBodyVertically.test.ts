import type { Dimensions, Rect } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { insetsBodyVertically } from "../../../testing/insetsBodyVertically";
import { isSingleBodyText } from "../../model/objects/types/text/TextType";
import { builtinObjectDocDefinitions } from "../builtinObjectDocDefinitions";
import type { ObjectDocDefinition } from "../ObjectDocDefinition";
import { calcFullBoxTextRegion } from "../ObjectDocTextRegion";

/**
 * {@link builtinObjectDocDefinitions} is inferred as a union of per-type literal
 * shapes, so reading a feature that only some types declare (`text`,
 * `textVerticalBasis`) does not type-check on its entries directly; widened to
 * the general type, every type's optional features read as such.
 */
const builtins: Readonly<Record<string, ObjectDocDefinition>> =
	builtinObjectDocDefinitions;

/** Insets the box by a fixed amount top and bottom, regardless of size. */
const insetTopAndBottom = (box: Dimensions): Rect => ({
	x: -box.width / 2,
	y: -box.height / 2 + 10,
	width: box.width,
	height: box.height - 20,
});

/** Insets the box on the sides only; the full height stays untouched. */
const insetSidesOnly = (box: Dimensions): Rect => ({
	x: -box.width / 2 + 10,
	y: -box.height / 2,
	width: box.width - 20,
	height: box.height,
});

/** Insets vertically only for a box taller than every probe but one. */
const insetOnlyWhenTall = (box: Dimensions): Rect => {
	const inset = box.height > 150 ? 20 : 0;
	return {
		x: -box.width / 2,
		y: -box.height / 2 + inset,
		width: box.width,
		height: box.height - inset * 2,
	};
};

describe("insetsBodyVertically", () => {
	it("is false for a region filling the whole box", () => {
		expect(insetsBodyVertically({ textRegion: calcFullBoxTextRegion })).toBe(
			false,
		);
	});

	it("is false for a type that declares no region at all", () => {
		expect(insetsBodyVertically({})).toBe(false);
	});

	it("is false for a region that never holds the text", () => {
		expect(insetsBodyVertically({ textRegion: () => null })).toBe(false);
	});

	it("is true for a region inset top and bottom", () => {
		expect(insetsBodyVertically({ textRegion: insetTopAndBottom })).toBe(true);
	});

	it("is false for a region inset on the sides only, the full height kept", () => {
		expect(insetsBodyVertically({ textRegion: insetSidesOnly })).toBe(false);
	});

	it("is false for a region inset vertically at some probed sizes but not all", () => {
		expect(insetsBodyVertically({ textRegion: insetOnlyWhenTall })).toBe(false);
	});
});

describe("insetsBodyVertically on the built-ins", () => {
	it("every built-in declares textVerticalBasis exactly where its region insets the body", () => {
		// A type with no single body (named slots, no text at all) has nothing for
		// the basis to place, so `isSingleBodyText(...) && insetsBodyVertically(...)`
		// is false for it regardless of its region, and the only agreeing
		// declaration is leaving textVerticalBasis out.
		const disagreeing = Object.entries(builtins)
			.filter(
				([, definition]) =>
					(definition.features.textVerticalBasis === true) !==
					(isSingleBodyText(definition.features.text) &&
						insetsBodyVertically(definition)),
			)
			.map(([type]) => type);

		expect(disagreeing).toEqual([]);
	});
});
