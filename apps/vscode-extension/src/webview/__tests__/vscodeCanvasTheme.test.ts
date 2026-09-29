import { darkCanvasTheme, lightCanvasTheme } from "@jiscribe/canvas";
import { describe, expect, it } from "vitest";

import {
	readVscodeThemeKind,
	toCanvasColorScheme,
	vscodeCanvasThemes,
} from "../vscodeCanvasTheme";

/** A stand-in for `document.body`: only the dataset the reader touches. */
const bodyWith = (params: { themeKind?: string }) => ({
	dataset: (params.themeKind === undefined
		? {}
		: { vscodeThemeKind: params.themeKind }) as DOMStringMap,
});

describe("toCanvasColorScheme", () => {
	it("reads both light kinds as light", () => {
		expect(toCanvasColorScheme("vscode-light")).toBe("light");
		expect(toCanvasColorScheme("vscode-high-contrast-light")).toBe("light");
	});

	it("reads both dark kinds as dark", () => {
		expect(toCanvasColorScheme("vscode-dark")).toBe("dark");
		expect(toCanvasColorScheme("vscode-high-contrast")).toBe("dark");
	});

	it("falls back to dark when the kind is missing or unknown", () => {
		expect(toCanvasColorScheme(undefined)).toBe("dark");
		expect(toCanvasColorScheme("vscode-sepia")).toBe("dark");
	});
});

describe("readVscodeThemeKind", () => {
	it("reads the data attribute VSCode writes", () => {
		expect(readVscodeThemeKind(bodyWith({ themeKind: "vscode-light" }))).toBe(
			"vscode-light",
		);
	});

	it("is undefined when the attribute is absent", () => {
		expect(readVscodeThemeKind(bodyWith({}))).toBe(undefined);
	});
});

describe("vscodeCanvasThemes", () => {
	it("map the same --vscode-* variables onto both grounds", () => {
		expect(vscodeCanvasThemes.dark.colorScheme).toBe("dark");
		expect(vscodeCanvasThemes.light.colorScheme).toBe("light");
		const mappedTokens = Object.entries(vscodeCanvasThemes.dark.tokens).filter(
			([, value]) => String(value).includes("var(--vscode-"),
		);
		expect(mappedTokens.length).toBeGreaterThan(0);
		for (const [name, value] of mappedTokens) {
			expect(
				vscodeCanvasThemes.light.tokens[
					name as keyof typeof vscodeCanvasThemes.light.tokens
				],
			).toBe(value);
		}
	});

	it("take every other token from the preset of their own ground", () => {
		const unmappedTokenNames = Object.keys(darkCanvasTheme.tokens).filter(
			(name) =>
				!String(
					vscodeCanvasThemes.dark.tokens[
						name as keyof typeof darkCanvasTheme.tokens
					],
				).includes("var(--vscode-"),
		);
		expect(unmappedTokenNames).toContain("transparentChecker");
		for (const name of unmappedTokenNames) {
			const tokenName = name as keyof typeof darkCanvasTheme.tokens;
			expect(vscodeCanvasThemes.dark.tokens[tokenName]).toBe(
				darkCanvasTheme.tokens[tokenName],
			);
			expect(vscodeCanvasThemes.light.tokens[tokenName]).toBe(
				lightCanvasTheme.tokens[tokenName],
			);
		}
		expect(vscodeCanvasThemes.light.handleDimensions).toEqual(
			lightCanvasTheme.handleDimensions,
		);
	});
});
