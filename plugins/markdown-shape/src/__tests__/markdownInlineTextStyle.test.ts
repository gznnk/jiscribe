import { createDocOps, type CanvasDoc } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { markdownDocPlugin } from "../doc";

// The schema holds a markdown `text` to a string and the renderer flattens runs,
// so the doc-ops must not write one.
describe("markdown inline text style", () => {
	const docOps = createDocOps({ plugins: [markdownDocPlugin] });

	it("refuses styling a stretch of the source, leaving it a string", () => {
		const doc: CanvasDoc = { version: 1, root: [] };
		const id = docOps.addObject(doc, "markdown", {
			x: 0,
			y: 0,
			text: "hello world",
		});

		expect(() =>
			docOps.setInlineTextStyle(doc, id, {
				match: "world",
				fontWeight: "bold",
			}),
		).toThrow(/holds its text as a plain string/);
		expect((doc.root[0] as { text?: unknown }).text).toBe("hello world");
	});
});
