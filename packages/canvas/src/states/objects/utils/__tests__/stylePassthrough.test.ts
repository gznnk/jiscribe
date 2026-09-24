import { describe, it, expect } from "vitest";

import { pick } from "../stylePassthrough";

describe("pick", () => {
	it("keeps only the allow-listed keys the source owns", () => {
		const src = { a: 1, b: 2, c: 3 };
		expect(pick(src, ["a", "c", "missing"])).toEqual({ a: 1, c: 3 });
	});

	it("keeps an explicit undefined, since the key is owned", () => {
		expect(pick({ a: undefined }, ["a"])).toEqual({ a: undefined });
		expect("a" in pick({ a: undefined }, ["a"])).toBe(true);
	});

	it("ignores inherited properties", () => {
		const src = Object.create({ inherited: "nope" }) as Record<string, unknown>;
		src.own = "yes";
		expect(pick(src, ["own", "inherited"])).toEqual({ own: "yes" });
	});

	it("does not pull prototype members in through the allow-list", () => {
		expect(pick({}, ["toString", "constructor", "__proto__"])).toEqual({});
	});

	it("returns a fresh object and does not mutate the source", () => {
		const src = { a: 1 };
		const picked = pick(src, ["a"]);
		picked.a = 2;
		expect(src.a).toBe(1);
	});
});
