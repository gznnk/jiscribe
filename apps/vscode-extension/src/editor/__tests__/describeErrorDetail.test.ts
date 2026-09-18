import { describe, expect, it } from "vitest";

import { describeErrorDetail } from "../describeErrorDetail";

describe("describeErrorDetail", () => {
	it("prefixes an Error's message with a colon, ready to append", () => {
		expect(describeErrorDetail(new Error("EACCES: permission denied"))).toBe(
			": EACCES: permission denied",
		);
	});

	it("keeps a subclass of Error, since only the message is read", () => {
		expect(describeErrorDetail(new TypeError("not a function"))).toBe(
			": not a function",
		);
	});

	it("says nothing about a value that is not an Error", () => {
		expect(describeErrorDetail("failed")).toBe("");
		expect(describeErrorDetail(undefined)).toBe("");
		expect(describeErrorDetail({ message: "failed" })).toBe("");
	});
});
