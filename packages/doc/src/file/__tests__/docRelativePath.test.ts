import { describe, expect, it } from "vitest";

import { splitDocRelativePath } from "../docRelativePath";

describe("splitDocRelativePath", () => {
	it("splits a nested relative path into its segments", () => {
		expect(splitDocRelativePath("images/logo.png")).toEqual([
			"images",
			"logo.png",
		]);
		expect(splitDocRelativePath("logo.png")).toEqual(["logo.png"]);
	});

	it.each([
		["", "empty"],
		["/etc/passwd", "leading slash"],
		["C:/work/a.png", "drive letter"],
		["c:a.png", "drive-relative"],
		["https://example.com/a.png", "scheme"],
		["data:image/png;base64,AAAA", "data scheme"],
		["../a.png", "parent segment"],
		["images/../a.png", "parent segment inside"],
		["./a.png", "dot segment"],
		["images//a.png", "empty segment"],
		["images/", "trailing slash"],
		["images\\a.png", "backslash"],
	])("rejects %j (%s)", (docRelativePath) => {
		expect(splitDocRelativePath(docRelativePath)).toBeNull();
	});

	it("keeps a segment that merely contains a colon or dots", () => {
		expect(splitDocRelativePath("images/a.b.c.png")).toEqual([
			"images",
			"a.b.c.png",
		]);
		expect(splitDocRelativePath("images/12:30.png")).toEqual([
			"images",
			"12:30.png",
		]);
	});
});
