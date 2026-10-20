import { TEXT_INLINE_STYLE_KEYS } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
	inlineTextStyleSchema,
	textMatchSchema,
} from "../inlineTextStyleSchema";

describe("inlineTextStyleSchema", () => {
	it("declares every typography field a run of characters carries, and nothing else", () => {
		expect(Object.keys(inlineTextStyleSchema).sort()).toEqual(
			[...TEXT_INLINE_STYLE_KEYS].sort(),
		);
	});
});

describe("textMatchSchema", () => {
	const matchArgs = z.object(textMatchSchema).strict();

	it("takes a stretch with or without an occurrence", () => {
		expect(matchArgs.safeParse({ match: "API" }).success).toBe(true);
		expect(matchArgs.safeParse({ match: "API", occurrence: 2 }).success).toBe(
			true,
		);
	});

	it("refuses an empty match and an occurrence that is not a count from 1", () => {
		expect(matchArgs.safeParse({ match: "" }).success).toBe(false);
		for (const occurrence of [0, 1.5]) {
			expect(matchArgs.safeParse({ match: "API", occurrence }).success).toBe(
				false,
			);
		}
	});
});
