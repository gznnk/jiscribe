import { describe, expect, it } from "vitest";

import { BRACKET_WITH_STEM_DOC_DEFAULTS } from "../BracketWithStemDoc";
import { BracketWithStemObjectFactory } from "../BracketWithStemObjectFactory";
import { validateBracketWithStemDoc } from "../validateBracketWithStemDoc";

const baseDoc = {
	...BRACKET_WITH_STEM_DOC_DEFAULTS,
	id: "bracket-with-stem-1",
} as Record<string, unknown>;

describe("validateBracketWithStemDoc", () => {
	it("accepts the defaults", () => {
		expect(validateBracketWithStemDoc(baseDoc, "root[0]")).toEqual([]);
	});

	it("accepts a doc that leaves direction and tipPosition out", () => {
		const { direction, tipPosition, ...withoutMarkerFields } = baseDoc;
		expect(direction).toBeDefined();
		expect(tipPosition).toBeDefined();
		expect(validateBracketWithStemDoc(withoutMarkerFields, "root[0]")).toEqual(
			[],
		);
	});

	it("rejects a direction outside the enum", () => {
		const errors = validateBracketWithStemDoc(
			{ ...baseDoc, direction: "top" },
			"root[0]",
		);
		expect(errors.map((error) => error.path)).toEqual(["root[0].direction"]);
	});

	it("rejects a tipPosition outside 0..1", () => {
		const errors = validateBracketWithStemDoc(
			{ ...baseDoc, tipPosition: 1.5 },
			"root[0]",
		);
		expect(errors.map((error) => error.path)).toEqual(["root[0].tipPosition"]);
	});
});

describe("BracketWithStemObjectFactory", () => {
	it("draws a tall drag as the typographic bracket", () => {
		const doc = BracketWithStemObjectFactory.createDocFromBounds(
			0,
			0,
			24,
			160,
		) as { direction: string } | null;
		expect(doc?.direction).toBe("left");
	});

	it("draws a wide drag along the horizontal axis instead", () => {
		const doc = BracketWithStemObjectFactory.createDocFromBounds(
			0,
			0,
			300,
			30,
		) as { direction: string } | null;
		expect(doc?.direction).toBe("down");
	});
});
