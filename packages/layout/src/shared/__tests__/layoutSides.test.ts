import { describe, expect, it } from "vitest";

import { toSideKey } from "../layoutSides";

describe("toSideKey", () => {
	it("gives one node's sides different keys", () => {
		expect(toSideKey("a", "top")).not.toBe(toSideKey("a", "left"));
	});

	it("gives one side of two nodes different keys", () => {
		expect(toSideKey("a:top", "left")).not.toBe(toSideKey("a", "left"));
	});
});
