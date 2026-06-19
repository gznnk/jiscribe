import { describe, it, expect } from "vitest";

import { getStrokeDasharray } from "../getStrokeDasharray";

describe("getStrokeDasharray", () => {
	describe("solid / 未指定", () => {
		it("undefined のとき undefined を返す", () => {
			expect(getStrokeDasharray(undefined)).toBeUndefined();
		});

		it("'solid' のとき undefined を返す", () => {
			expect(getStrokeDasharray("solid")).toBeUndefined();
		});

		it("strokeWidth を渡しても solid は undefined を返す", () => {
			expect(getStrokeDasharray("solid", 5)).toBeUndefined();
		});
	});

	describe("dashed", () => {
		it("strokeWidth=1 のとき '4 4' を返す", () => {
			expect(getStrokeDasharray("dashed", 1)).toBe("4 4");
		});

		it("strokeWidth=2 のとき '8 8' を返す", () => {
			expect(getStrokeDasharray("dashed", 2)).toBe("8 8");
		});

		it("strokeWidth=0.5 のとき '2 2' を返す", () => {
			expect(getStrokeDasharray("dashed", 0.5)).toBe("2 2");
		});

		it("strokeWidth 省略時はデフォルト 1 が適用される", () => {
			expect(getStrokeDasharray("dashed")).toBe("4 4");
		});
	});

	describe("dotted", () => {
		it("strokeWidth=1 のとき '1 2' を返す", () => {
			expect(getStrokeDasharray("dotted", 1)).toBe("1 2");
		});

		it("strokeWidth=3 のとき '3 6' を返す", () => {
			expect(getStrokeDasharray("dotted", 3)).toBe("3 6");
		});

		it("strokeWidth=2 のとき '2 4' を返す", () => {
			expect(getStrokeDasharray("dotted", 2)).toBe("2 4");
		});

		it("strokeWidth 省略時はデフォルト 1 が適用される", () => {
			expect(getStrokeDasharray("dotted")).toBe("1 2");
		});
	});
});
