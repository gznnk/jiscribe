import { describe, expect, it } from "vitest";

import { suggestIconNames } from "../suggestIconNames";

describe("suggestIconNames", () => {
	it("puts the same words in another order first", () => {
		// The alias table does not cover this reordering, so the word-set pass is the
		// only thing that can find it.
		expect(suggestIconNames("clock-alarm")[0]).toBe("alarm-clock");
	});

	it("finds a name that only lost its separator", () => {
		expect(suggestIconNames("trash2")).toContain("trash-2");
	});

	it("finds a name a typo is one edit from", () => {
		expect(suggestIconNames("databse")).toContain("database");
	});

	it("offers the names that add a word to an incomplete one", () => {
		expect(suggestIconNames("chevron")).toContain("chevron-down");
	});

	it("finds a name the set respelled with separators", () => {
		// lucide 1.31 renamed this family (`arrow-down-az` -> `arrow-down-a-z`) and kept
		// no alias for the old spelling, so only the edit-distance pass reaches it.
		expect(suggestIconNames("arrow-down-az")).toContain("arrow-down-a-z");
	});

	it("normalizes before comparing, so a spelling variant of a near-miss still helps", () => {
		expect(suggestIconNames("clockAlarm")[0]).toBe("alarm-clock");
	});

	it("never offers the name it was given", () => {
		expect(suggestIconNames("lock")).not.toContain("lock");
	});

	it("offers at most three candidates", () => {
		expect(suggestIconNames("chevron").length).toBeLessThanOrEqual(3);
	});

	it("offers nothing for a name resembling nothing", () => {
		expect(suggestIconNames("qwertyuiopasdfgh")).toEqual([]);
		expect(suggestIconNames("   ")).toEqual([]);
	});
});
