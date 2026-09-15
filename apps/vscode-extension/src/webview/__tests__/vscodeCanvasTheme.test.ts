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
	it("differ in colorScheme alone", () => {
		expect(vscodeCanvasThemes.dark.colorScheme).toBe("dark");
		expect(vscodeCanvasThemes.light.colorScheme).toBe("light");
		expect(vscodeCanvasThemes.light.tokens).toBe(
			vscodeCanvasThemes.dark.tokens,
		);
		expect(vscodeCanvasThemes.light.handleDimensions).toEqual(
			vscodeCanvasThemes.dark.handleDimensions,
		);
	});
});
