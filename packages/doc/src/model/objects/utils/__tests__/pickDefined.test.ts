import { describe, expect, it } from "vitest";

import { pickDefined } from "../pickDefined";

describe("pickDefined", () => {
	it("copies the named fields that carry a value", () => {
		expect(
			pickDefined({ fontSize: 14, fontColor: "#000", textAlign: "left" }, [
				"fontSize",
				"fontColor",
			]),
		).toEqual({ fontSize: 14, fontColor: "#000" });
	});

	it("leaves out an undefined field rather than copying the key", () => {
		const picked = pickDefined({ fontSize: undefined, fontColor: "#000" }, [
			"fontSize",
			"fontColor",
		]);
		expect(Object.keys(picked)).toEqual(["fontColor"]);
	});

	it("copies a falsy value, which is a value like any other", () => {
		expect(
			pickDefined({ a: null, b: 0, c: "", d: false }, ["a", "b", "c", "d"]),
		).toEqual({ a: null, b: 0, c: "", d: false });
	});

	it("leaves behind a field the keys do not name", () => {
		expect(
			pickDefined({ fontSize: 14, fontColor: "#000" }, ["fontSize"]),
		).toEqual({ fontSize: 14 });
	});

	it("yields an empty object when nothing is set", () => {
		expect(pickDefined({ fontSize: undefined }, ["fontSize"])).toEqual({});
		expect(pickDefined({ fontSize: 14 }, [])).toEqual({});
	});

	it("builds a fresh object rather than handing the source back", () => {
		const source = { fontSize: 14 };
		expect(pickDefined(source, ["fontSize"])).not.toBe(source);
	});
});
