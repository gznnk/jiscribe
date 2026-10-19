import { describe, expect, it } from "vitest";

import { collectPartIdsBetween } from "../collectPartIdsBetween";

const ORDER = ["name", "attributes", "operations", "footer"];

describe("collectPartIdsBetween", () => {
	it("returns the inclusive run between the two ids", () => {
		expect(collectPartIdsBetween(ORDER, "attributes", "footer")).toEqual([
			"attributes",
			"operations",
			"footer",
		]);
	});

	it("reads the run in list order even when the anchor comes after the focus", () => {
		expect(collectPartIdsBetween(ORDER, "footer", "attributes")).toEqual([
			"attributes",
			"operations",
			"footer",
		]);
	});

	it("returns the one part when both ends name it", () => {
		expect(collectPartIdsBetween(ORDER, "name", "name")).toEqual(["name"]);
	});

	it("collapses to the clicked part when the anchor is no longer listed", () => {
		expect(collectPartIdsBetween(ORDER, "removed", "operations")).toEqual([
			"operations",
		]);
	});

	it("collapses to the clicked part when it is not listed either", () => {
		expect(collectPartIdsBetween(ORDER, "name", "removed")).toEqual([
			"removed",
		]);
	});
});
