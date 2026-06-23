import { describe, it, expect } from "vitest";

import { validateGroupDoc } from "../validateGroupDoc";

describe("validateGroupDoc", () => {
	it("空オブジェクトはエラーなし", () => {
		expect(validateGroupDoc({}, "root")).toEqual([]);
	});

	it("有効な transform フィールドはエラーなし", () => {
		expect(
			validateGroupDoc({ rotation: 90, flipX: false, flipY: true }, "root"),
		).toEqual([]);
	});

	it("rotation が数値でない場合はエラー", () => {
		const errors = validateGroupDoc({ rotation: "90deg" }, "root");
		expect(errors.some((e) => e.path === "root.rotation")).toBe(true);
	});

	it("flipX が boolean でない場合はエラー", () => {
		const errors = validateGroupDoc({ flipX: 1 }, "root");
		expect(errors.some((e) => e.path === "root.flipX")).toBe(true);
	});

	it("children の検証は validateStructure 側で行うためここではエラーなし", () => {
		// children の中身は validateGroupDoc の責務外
		expect(validateGroupDoc({ children: "invalid" }, "root")).toEqual([]);
	});

	// ─── 強化 ───
	it("flipY が boolean でない場合はエラー", () => {
		const errors = validateGroupDoc({ flipY: "yes" }, "root");
		expect(errors.some((e) => e.path === "root.flipY")).toBe(true);
	});

	it("複数の transform フィールドの不正はすべて報告される", () => {
		const errors = validateGroupDoc(
			{ rotation: "x", flipX: 1, flipY: 0 },
			"root",
		);
		expect(errors.some((e) => e.path === "root.rotation")).toBe(true);
		expect(errors.some((e) => e.path === "root.flipX")).toBe(true);
		expect(errors.some((e) => e.path === "root.flipY")).toBe(true);
	});

	it("group は geometry/style を持たないため stroke/fill/x は検証しない", () => {
		// transform 以外（stroke/fill/座標）は group の責務外で素通り
		expect(
			validateGroupDoc({ stroke: "a;b", fill: 1, x: "no" }, "root"),
		).toEqual([]);
	});
});
