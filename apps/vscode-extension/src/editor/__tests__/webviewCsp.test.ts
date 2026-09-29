import { describe, expect, it } from "vitest";

import { buildCanvasWebviewCsp } from "../webviewCsp";

// Shaped like the real value, whose scheme is VSCode-private rather than http(s).
const CSP_SOURCE = "vscode-webview://0123abcd";
const NONCE = "nonce123";

/** Splits a CSP into `directive -> sources`, the way a browser reads it. */
const parseDirectives = (csp: string): Map<string, string[]> => {
	const directives = new Map<string, string[]>();
	for (const clause of csp.split(";")) {
		const [name, ...sources] = clause.trim().split(/\s+/);
		if (name) {
			directives.set(name, sources);
		}
	}
	return directives;
};

describe("buildCanvasWebviewCsp", () => {
	const directives = parseDirectives(buildCanvasWebviewCsp(CSP_SOURCE, NONCE));

	it("denies everything by default", () => {
		expect(directives.get("default-src")).toEqual(["'none'"]);
	});

	it("lets images come only from the Webview itself and blob: URLs (#28)", () => {
		// A markdown image pointing at a remote host must not be fetchable, and
		// neither must an inline data: image slip past the sanitizer.
		expect(directives.get("img-src")).toEqual([CSP_SOURCE, "blob:"]);
	});

	it("never opens a network or data: scheme in any directive", () => {
		for (const [name, sources] of directives) {
			for (const source of sources) {
				expect(source, `${name} allows ${source}`).not.toMatch(
					/^(https?:|data:|\*)/,
				);
			}
		}
	});

	it("runs only the bundle's nonce-tagged script", () => {
		expect(directives.get("script-src")).toEqual([`'nonce-${NONCE}'`]);
	});

	it("declares no connect-src, so nothing can be fetched or posted out", () => {
		expect(directives.has("connect-src")).toBe(false);
	});
});
