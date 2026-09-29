import { describe, expect, it } from "vitest";

import { collectDirectoryPrefixes } from "../writeDestinationPaths";

describe("collectDirectoryPrefixes", () => {
	it("lists a destination's directories parents first", () => {
		expect(
			collectDirectoryPrefixes([[".claude", "skills", "jiscribe", "SKILL.md"]]),
		).toEqual([
			[".claude"],
			[".claude", "skills"],
			[".claude", "skills", "jiscribe"],
		]);
	});

	it("keeps a shared directory once, at the depth it first appears", () => {
		expect(
			collectDirectoryPrefixes([
				[".jiscribe", "ai-guide.md"],
				[".jiscribe", "jiscribe.schema.json"],
				[".cursor", "rules", "jiscribe.mdc"],
			]),
		).toEqual([[".jiscribe"], [".cursor"], [".cursor", "rules"]]);
	});

	it("contributes nothing for a file sitting at the workspace root", () => {
		expect(collectDirectoryPrefixes([["CLAUDE.md"]])).toEqual([]);
	});

	it("returns nothing for no destinations", () => {
		expect(collectDirectoryPrefixes([])).toEqual([]);
	});
});
