import type { CanvasDoc } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { createCanvasOpHistory } from "../canvasOpHistory";

/** Telling the contents apart is all that matters, so a step is stood for by a document of ids lined up */
const docWith = (...ids: string[]): CanvasDoc =>
	({
		version: 1,
		root: ids.map((id) => ({ id, type: "rect", x: 0, y: 0 })),
	}) as unknown as CanvasDoc;

describe("createCanvasOpHistory", () => {
	it("returns the document from before the last step", () => {
		const history = createCanvasOpHistory();
		const before = docWith();
		const after = docWith("rect-1");
		history.push(before, after);

		expect(history.pop(after)).toBe(before);
		expect(history.depth()).toBe(0);
	});

	it("returns null when nothing has been pushed", () => {
		expect(createCanvasOpHistory().pop(docWith())).toBeNull();
	});

	it("walks back in the reverse of the order it was pushed", () => {
		const history = createCanvasOpHistory();
		const [empty, one, two] = [
			docWith(),
			docWith("rect-1"),
			docWith("rect-1", "rect-2"),
		];
		history.push(empty, one);
		history.push(one, two);

		expect(history.pop(two)).toBe(one);
		expect(history.pop(one)).toBe(empty);
		expect(history.depth()).toBe(0);
	});

	it("refuses to go back when the user edited after the AI left it", () => {
		const history = createCanvasOpHistory();
		history.push(docWith(), docWith("rect-1"));

		// A document the user added a shape to; going back the AI's step alone would
		// take this addition with it
		expect(history.pop(docWith("rect-1", "rect-2"))).toBeNull();
		// The history stays, as something to judge on (so that the caller can tell
		// this apart from a history that has run out)
		expect(history.depth()).toBe(1);
	});

	it("goes back on matching contents even when the object differs (a document is rebuilt every time)", () => {
		const history = createCanvasOpHistory();
		const before = docWith();
		history.push(before, docWith("rect-1"));

		expect(history.pop(docWith("rect-1"))).toBe(before);
	});

	it("drops the oldest steps once it is over the limit", () => {
		const history = createCanvasOpHistory();
		const ids: string[] = [];
		for (let step = 0; step < 25; step += 1) {
			const before = docWith(...ids);
			ids.push(`rect-${step}`);
			history.push(before, docWith(...ids));
		}

		expect(history.depth()).toBe(20);
	});
});
