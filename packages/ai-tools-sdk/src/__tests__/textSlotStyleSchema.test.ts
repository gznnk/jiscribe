import { TEXT_SLOT_STYLE_KEYS } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import {
	AI_FONT_WEIGHTS,
	canonicalizeFontWeight,
	textSlotStyleSchema,
} from "../textSlotStyleSchema";

describe("canonicalizeFontWeight", () => {
	it("stores the two rungs a design token spells in numbers as their words, and every other weight as written", () => {
		expect(AI_FONT_WEIGHTS.map(canonicalizeFontWeight)).toEqual([
			"normal",
			"normal",
			"500",
			"600",
			"bold",
			"bold",
		]);
	});
});

describe("textSlotStyleSchema", () => {
	it("declares every typography field a text slot holds, and nothing else", () => {
		expect(Object.keys(textSlotStyleSchema).sort()).toEqual(
			[...TEXT_SLOT_STYLE_KEYS].sort(),
		);
	});
});
