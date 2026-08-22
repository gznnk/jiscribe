import { describe, expect, it } from "vitest";

import { builtinObjectDocDefinitions } from "../builtinObjectDocDefinitions";
import type { ObjectDocDefinition } from "../ObjectDocDefinition";
import {
	calcFullBoxTextRegion,
	calcOutsideBoxTextRegion,
} from "../ObjectDocTextRegion";
import { supportsAutoHeight } from "../supportsAutoHeight";

/** A rect-geometry body-text type, the shape of every candidate. */
const boxFeatures: ObjectDocDefinition["features"] = {
	type: "probe",
	geometry: "rect",
	text: "body",
};

describe("supportsAutoHeight", () => {
	it("is true for a box that lays its text out inside itself", () => {
		expect(
			supportsAutoHeight({
				features: boxFeatures,
				textRegion: calcFullBoxTextRegion,
			}),
		).toBe(true);
	});

	it("is false for a shape whose label is drawn outside its outline", () => {
		expect(
			supportsAutoHeight({
				features: boxFeatures,
				textRegion: calcOutsideBoxTextRegion,
			}),
		).toBe(false);
	});

	it("is false for a type that declares no region at all", () => {
		expect(supportsAutoHeight({ features: boxFeatures })).toBe(false);
	});

	it("is false where there is no stored height to leave out", () => {
		for (const geometry of ["ellipse", "point", "poly", "none"] as const) {
			expect(
				supportsAutoHeight({
					features: { ...boxFeatures, geometry },
					textRegion: calcFullBoxTextRegion,
				}),
			).toBe(false);
		}
	});

	it("is false for a type whose text is named slots rather than one body", () => {
		expect(
			supportsAutoHeight({
				features: { ...boxFeatures, text: "slots" },
				textRegion: calcFullBoxTextRegion,
			}),
		).toBe(false);
	});

	it("is false where the type denies what its own region implies", () => {
		expect(
			supportsAutoHeight({
				features: boxFeatures,
				textRegion: calcFullBoxTextRegion,
				autoHeight: false,
			}),
		).toBe(false);
	});

	it("names the built-ins that can be sized from their text", () => {
		const sized = Object.entries(builtinObjectDocDefinitions)
			.filter(([, definition]) => supportsAutoHeight(definition))
			.map(([type]) => type);
		// `ellipse` and `text` hold their text but store no height; the rest hold
		// no text at all.
		expect(sized).toEqual(["rect"]);
	});
});
