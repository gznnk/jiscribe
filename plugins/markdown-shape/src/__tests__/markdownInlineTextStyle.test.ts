import { createDocOps, type CanvasDoc } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { markdownDocPlugin } from "../doc";

// A source body is a plain string the shape renders itself, so the doc-ops must
// not write a run into it (features.text: "source").
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
