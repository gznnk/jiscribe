import { describe, expect, it } from "vitest";

import { builtinObjectDocDefinitions } from "../builtinObjectDocDefinitions";
import type { ObjectDocDefinition } from "../ObjectDocDefinition";
import { supportsAutoHeight } from "../supportsAutoHeight";

/** A rect-geometry body-text type, the shape of every candidate. */
const boxFeatures: ObjectDocDefinition["features"] = {
	type: "probe",
	geometry: "rect",
	text: "body",
};

describe("supportsAutoHeight", () => {
	it("is true for a box that lays its body out inside itself", () => {
		expect(supportsAutoHeight({ features: boxFeatures })).toBe(true);
	});

	it("is false where there is no stored height to leave out", () => {
		for (const geometry of ["ellipse", "point", "poly", "none"] as const) {
			expect(
				supportsAutoHeight({
					features: { ...boxFeatures, geometry },
				}),
			).toBe(false);
		}
	});

	it("is false for a type whose text is named slots rather than one body", () => {
		expect(
			supportsAutoHeight({
				features: { ...boxFeatures, text: "slots" },
			}),
		).toBe(false);
	});

	it("is false where the type denies what its features imply", () => {
		expect(
			supportsAutoHeight({ features: boxFeatures, autoHeight: false }),
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

describe("supportsAutoHeight on a source-text type", () => {
	it("is false, the shape drawing its body itself rather than through the shared layout", () => {
		expect(
			supportsAutoHeight({
				features: { ...boxFeatures, text: "source" },
			}),
		).toBe(false);
	});
});

describe("supportsAutoHeight on a label-text type", () => {
	it("is false, the caption being sized from its own text rather than the box", () => {
		expect(
			supportsAutoHeight({ features: { ...boxFeatures, text: "label" } }),
		).toBe(false);
	});
});
