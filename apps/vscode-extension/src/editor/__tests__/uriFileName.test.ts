import { describe, expect, it } from "vitest";

import { uriFileName } from "../uriFileName";

describe("uriFileName", () => {
	it("returns the segment after the last slash", () => {
		expect(uriFileName({ path: "/home/user/diagram.jis.png" })).toBe(
			"diagram.jis.png",
		);
	});

	it("returns a path with no slash whole", () => {
		expect(uriFileName({ path: "diagram.jis" })).toBe("diagram.jis");
	});

	it("returns an empty string for a path with no file name", () => {
		expect(uriFileName({ path: "/home/user/" })).toBe("");
		expect(uriFileName({ path: "" })).toBe("");
	});
});
