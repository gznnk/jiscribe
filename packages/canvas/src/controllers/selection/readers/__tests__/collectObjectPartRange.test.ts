import { describe, expect, it } from "vitest";

import { collectObjectPartRange } from "../collectObjectPartRange";

const ORDER = ["name", "attributes", "operations", "footer"];

describe("collectObjectPartRange", () => {
	it("returns the inclusive run between the two ids", () => {
		expect(collectObjectPartRange(ORDER, "attributes", "footer")).toEqual([
			"attributes",
			"operations",
			"footer",
		]);
	});

	it("reads the run in list order even when the anchor comes after the focus", () => {
		expect(collectObjectPartRange(ORDER, "footer", "attributes")).toEqual([
			"attributes",
			"operations",
			"footer",
		]);
	});

	it("returns the one part when both ends name it", () => {
		expect(collectObjectPartRange(ORDER, "name", "name")).toEqual(["name"]);
	});

	it("collapses to the clicked part when the anchor is no longer listed", () => {
		expect(collectObjectPartRange(ORDER, "removed", "operations")).toEqual([
			"operations",
		]);
	});

	it("collapses to the clicked part when it is not listed either", () => {
		expect(collectObjectPartRange(ORDER, "name", "removed")).toEqual([
			"removed",
		]);
	});
});
