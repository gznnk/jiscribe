import { describe, expect, it } from "vitest";

import { theme } from "../../constants/theme";
import type { CanvasThemeTokens } from "../CanvasTheme";
import { buildThemeCssVars, THEME_TOKEN_CSS_VARS } from "../themeCssVars";
import { darkCanvasTheme, lightCanvasTheme } from "../themePresets";

const tokenNames = Object.keys(
	THEME_TOKEN_CSS_VARS,
) as (keyof CanvasThemeTokens)[];

describe("THEME_TOKEN_CSS_VARS", () => {
	it("every CSS variable uses the neutral --jiscribe- prefix", () => {
		for (const tokenName of tokenNames) {
			expect(THEME_TOKEN_CSS_VARS[tokenName]).toMatch(/^--jiscribe-[a-z-]+$/);
		}
	});

	it("CSS variable names do not collide", () => {
		const varNames = Object.values(THEME_TOKEN_CSS_VARS);
		expect(new Set(varNames).size).toBe(varNames.length);
	});
});

describe("buildThemeCssVars", () => {
	it("declares every token under its CSS variable name with the theme's value", () => {
		const cssVars = buildThemeCssVars(darkCanvasTheme.tokens);
		expect(Object.keys(cssVars)).toHaveLength(tokenNames.length);
		for (const tokenName of tokenNames) {
			expect(cssVars[THEME_TOKEN_CSS_VARS[tokenName]]).toBe(
				darkCanvasTheme.tokens[tokenName],
			);
		}
	});

	it("host tokens may hold var() expressions (VSCode mapping layer)", () => {
		const cssVars = buildThemeCssVars({
			...darkCanvasTheme.tokens,
			canvasBg: "var(--vscode-editor-background, #1e1e1e)",
		});
		expect(cssVars["--jiscribe-canvas-bg"]).toBe(
			"var(--vscode-editor-background, #1e1e1e)",
		);
	});
});

describe("static theme tokens (constants/theme.ts)", () => {
	it("each token references its CSS variable with the dark value as fallback", () => {
		for (const tokenName of tokenNames) {
			expect(theme[tokenName]).toBe(
				`var(${THEME_TOKEN_CSS_VARS[tokenName]}, ${darkCanvasTheme.tokens[tokenName]})`,
			);
		}
	});
});

describe("theme presets", () => {
	it("dark and light presets define the same token set", () => {
		expect(Object.keys(lightCanvasTheme.tokens).sort()).toEqual(
			Object.keys(darkCanvasTheme.tokens).sort(),
		);
	});

	it("fontFamily is a concrete font (no var()), usable for canvas text measurement", () => {
		expect(darkCanvasTheme.fontFamily).not.toContain("var(");
		expect(lightCanvasTheme.fontFamily).not.toContain("var(");
	});
});
