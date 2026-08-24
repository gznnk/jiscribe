import type { Rect } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { builtinObjectDocDefinitions } from "../builtinObjectDocDefinitions";
import { hasInsetTextRegion } from "../hasInsetTextRegion";
import type { ObjectDocDefinition } from "../ObjectDocDefinition";
import {
	calcFullBoxTextRegion,
	calcOutsideBoxTextRegion,
} from "../ObjectDocTextRegion";

/** A rect-geometry body-text type, the shape of every candidate. */
const boxFeatures: ObjectDocDefinition["features"] = {
	type: "probe",
	geometry: "rect",
	text: "body",
};

/** A region that keeps `band` off the top of the box, as a cap or header does. */
const cappedTextRegion =
	(band: number) =>
	({ width, height }: { width: number; height: number }): Rect => ({
		x: -width / 2,
		y: -height / 2 + band,
		width,
		height: height - band,
	});

/** A region inset on the sides alone, as a stadium's rounded caps are. */
const sideInsetTextRegion = ({
	width,
	height,
}: {
	width: number;
	height: number;
}): Rect => ({
	x: -width / 2 + 10,
	y: -height / 2,
	width: width - 20,
	height,
});

/** A label drawn under the outline, sized from its own text. */
const belowBoxTextRegion = ({
	width,
	height,
}: {
	width: number;
	height: number;
}): Rect => ({ x: -width / 2, y: height / 2, width, height: 20 });

describe("hasInsetTextRegion", () => {
	it("is true for a box that keeps its text off a band of its own height", () => {
		expect(
			hasInsetTextRegion({
				features: boxFeatures,
				textRegion: cappedTextRegion(20),
			}),
		).toBe(true);
	});

	it("is false for a box whose text takes the whole height", () => {
		expect(
			hasInsetTextRegion({
				features: boxFeatures,
				textRegion: calcFullBoxTextRegion,
			}),
		).toBe(false);
	});

	it("is false for a region inset on the sides alone", () => {
		// The basis swaps the vertical extent only, so such a type would take the
		// switch nowhere.
		expect(
			hasInsetTextRegion({
				features: boxFeatures,
				textRegion: sideInsetTextRegion,
			}),
		).toBe(false);
	});

	it("is false for a label drawn outside the box", () => {
		expect(
			hasInsetTextRegion({
				features: boxFeatures,
				textRegion: belowBoxTextRegion,
			}),
		).toBe(false);
		expect(
			hasInsetTextRegion({
				features: boxFeatures,
				textRegion: calcOutsideBoxTextRegion,
			}),
		).toBe(false);
	});

	it("is false for a type that declares no region at all", () => {
		expect(hasInsetTextRegion({ features: boxFeatures })).toBe(false);
	});

	it("is false for a type whose text is named slots rather than one body", () => {
		expect(
			hasInsetTextRegion({
				features: { ...boxFeatures, text: "slots" },
				textRegion: cappedTextRegion(20),
			}),
		).toBe(false);
	});

	it("is false for a type carrying no text", () => {
		expect(
			hasInsetTextRegion({
				features: { type: "probe", geometry: "rect" },
				textRegion: cappedTextRegion(20),
			}),
		).toBe(false);
	});

	it("names the built-ins whose body moves with the basis", () => {
		const inset = Object.entries(builtinObjectDocDefinitions)
			.filter(([, definition]) => hasInsetTextRegion(definition))
			.map(([type]) => type);
		// `rect` and `text` lay their text out over the whole box, so the two bases
		// name the same rectangle; the rest hold no text at all.
		expect(inset).toEqual(["ellipse"]);
	});
});
