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
});
