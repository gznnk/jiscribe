import { describe, expect, it } from "vitest";

import { EMPTY_CANVAS_DOC_JSON, toWebviewDocSource } from "../canvasDocSource";

describe("toWebviewDocSource", () => {
	it("treats a file with no content as a new empty document", () => {
		// A file created empty in the Explorer must open as a blank canvas, not as
		// a JSON syntax error.
		expect(toWebviewDocSource("")).toBe(EMPTY_CANVAS_DOC_JSON);
		expect(toWebviewDocSource("\n \t\n")).toBe(EMPTY_CANVAS_DOC_JSON);
	});

	it("re-indents parseable JSON", () => {
		expect(toWebviewDocSource('{"version":1,"root":[]}')).toBe(
			EMPTY_CANVAS_DOC_JSON,
		);
	});

	it("passes broken JSON through so the Webview reports the error", () => {
		expect(toWebviewDocSource("{ nope")).toBe("{ nope");
	});
});

describe("EMPTY_CANVAS_DOC_JSON", () => {
	it("is an empty document the parser accepts", () => {
		expect(JSON.parse(EMPTY_CANVAS_DOC_JSON)).toEqual({
			version: 1,
			root: [],
		});
	});
});
