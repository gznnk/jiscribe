import { describe, it, expect } from "vitest";

import { theme } from "../../../../constants/theme";
import { resolveAutoColor } from "../resolveAutoColor";

describe("resolveAutoColor", () => {
	it('ink ロールの "auto" はテーマ前景（theme.foreground）へ解決する', () => {
		expect(resolveAutoColor("auto", "ink")).toBe(theme.foreground);
	});

	it('surface ロールの "auto" はテーマのサーフェス（theme.surface）へ解決する', () => {
		expect(resolveAutoColor("auto", "surface")).toBe(theme.surface);
	});

	it("具体色はロールに関わらずそのまま返す", () => {
		expect(resolveAutoColor("#6b7280", "ink")).toBe("#6b7280");
		expect(resolveAutoColor("#fef9c3", "surface")).toBe("#fef9c3");
		expect(resolveAutoColor("transparent", "surface")).toBe("transparent");
	});

	it("未指定はロール既定（ink: 前景 / surface: transparent）を返す", () => {
		expect(resolveAutoColor(undefined, "ink")).toBe(theme.foreground);
		expect(resolveAutoColor(undefined, "surface")).toBe("transparent");
	});

	it("未指定は fallback 指定があればそれを優先する", () => {
		expect(resolveAutoColor(undefined, "ink", "red")).toBe("red");
	});

	it('"auto" は fallback 指定があってもロールトークンを優先する', () => {
		expect(resolveAutoColor("auto", "surface", "red")).toBe(theme.surface);
	});
});
