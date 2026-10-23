import {
	createDocOps,
	type CanvasDoc,
	type CanvasDocPlugin,
} from "@jiscribe/doc";
import { containerDocPlugin } from "@jiscribe/plugin-container-shapes/doc";
import { flowchartDocPlugin } from "@jiscribe/plugin-flowchart-shapes/doc";
import { markdownDocPlugin } from "@jiscribe/plugin-markdown-shape/doc";
import { umlDocPlugin } from "@jiscribe/plugin-uml-shapes/doc";
import { describe, expect, it } from "vitest";

import type { AiDocOp } from "../../canvasOps";
import { createCanvasToolSet } from "../../canvasToolSet";
import { applyCanvasOp } from "../applyCanvasOp";
import { createCanvasOpHistory } from "../canvasOpHistory";
import type { AiDocBridge } from "../docBridge";

/** Builds docOps with the same four plugins as the shipping set (desktop / web) */
const docPlugins: readonly CanvasDocPlugin[] = [
	flowchartDocPlugin,
	containerDocPlugin,
	markdownDocPlugin,
	umlDocPlugin,
];

const docOps = createDocOps({ plugins: docPlugins });

/** The built-in tools alone; the plugin tools have a suite of their own (applyCanvasOpObjectTool) */
const builtinToolSet = createCanvasToolSet(null, []);

/** The smallest stand-in for a host's docBridge; it keeps what was replaced so the test can inspect it */
const createFakeDocBridge = (
	initialDoc: CanvasDoc = { version: 1, root: [] },
) => {
	let doc = initialDoc;
	const replacedDocs: CanvasDoc[] = [];
	const bridge: AiDocBridge = {
		getDoc: () => doc,
		replaceDoc: (nextDoc) => {
			replacedDocs.push(nextDoc);
			doc = nextDoc;
		},
	};
	const history = createCanvasOpHistory();
	return {
		bridge,
		history,
		replacedDocs,
		currentDoc: () => doc,
		apply: (op: AiDocOp) =>
			applyCanvasOp(op, bridge, history, docOps, builtinToolSet),
	};
};

describe("setBackground", () => {
	it("writes the color as it stands, and says which color was painted", () => {
		const { apply, currentDoc } = createFakeDocBridge();

		const result = apply({ kind: "setBackground", color: "#fafafa" });

		expect(result.ok).toBe(true);
		expect(result.text).toBe("painted the canvas background #fafafa");
		expect(currentDoc().background).toBe("#fafafa");
	});

	// "painted it white" and "handed it back to the theme" are different things,
	// and the AI decides what to do next from this sentence alone
	it("drops the field on null, and tells clearing apart from painting in what it writes", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({ kind: "setBackground", color: "#fafafa" });

		const result = apply({ kind: "setBackground", color: null });

		expect(result.text).toBe(
			"cleared the canvas background, so the surface follows the viewer's theme again",
		);
		expect(currentDoc()).not.toHaveProperty("background");
	});

	it("returns ok:false on a blank color, and leaves the document alone", () => {
		const { apply, currentDoc, replacedDocs } = createFakeDocBridge();
		apply({ kind: "setBackground", color: "#fafafa" });
		const replacedCountBeforeFailure = replacedDocs.length;

		const result = apply({ kind: "setBackground", color: "  " });

		expect(result.ok).toBe(false);
		expect(result.text).toContain("must be a CSS color");
		expect(currentDoc().background).toBe("#fafafa");
		expect(replacedDocs).toHaveLength(replacedCountBeforeFailure);
	});
});

describe("setDocumentView", () => {
	it("lists every side of the padding, filling in the ones left out as 0", () => {
		const { apply, currentDoc } = createFakeDocBridge();

		const result = apply({ kind: "setDocumentView", padding: { bottom: 40 } });

		expect(result.ok).toBe(true);
		expect(result.text).toBe(
			"the document now declares padding top 0 / right 0 / bottom 40 / left 0 px",
		);
		// Only the side worth storing reaches the document
		expect(currentDoc().view).toEqual({ padding: { bottom: 40 } });
	});

	it("writes all three parts, in the order the sentence lists them", () => {
		const { apply, currentDoc } = createFakeDocBridge();

		const result = apply({
			kind: "setDocumentView",
			padding: { top: 10, right: 20, bottom: 30, left: 40 },
			open: "fit-width",
			scroll: "content",
		});

		expect(result.text).toBe(
			'the document now declares padding top 10 / right 20 / bottom 30 / left 40 px, framing "fit-width" on open, scrolling "content"',
		);
		expect(currentDoc().view).toEqual({
			padding: { top: 10, right: 20, bottom: 30, left: 40 },
			open: "fit-width",
			scroll: "content",
		});
	});

	// The sentence reads the declaration back rather than echoing the request:
	// a padding of 0 on every side declares nothing at all
	it("says nothing is declared when a padding of all zeroes is the only part given", () => {
		const { apply, currentDoc } = createFakeDocBridge();

		const result = apply({
			kind: "setDocumentView",
			padding: { top: 0, right: 0, bottom: 0, left: 0 },
		});

		expect(result.ok).toBe(true);
		expect(result.text).toBe(
			"the document now declares nothing about how it is presented, so each host frames it its own way",
		);
		expect(currentDoc()).not.toHaveProperty("view");
	});

	it("leaves the parts it was not given as they stand", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({ kind: "setDocumentView", padding: { top: 24 }, open: "fit-all" });

		const result = apply({ kind: "setDocumentView", scroll: "infinite" });

		expect(result.text).toBe(
			'the document now declares padding top 24 / right 0 / bottom 0 / left 0 px, framing "fit-all" on open, scrolling "infinite"',
		);
		expect(currentDoc().view).toEqual({
			padding: { top: 24 },
			open: "fit-all",
			scroll: "infinite",
		});
	});

	it("drops one part on null and keeps the rest", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({ kind: "setDocumentView", padding: { top: 24 }, open: "fit-all" });

		const result = apply({ kind: "setDocumentView", open: null });

		expect(result.text).toBe(
			"the document now declares padding top 24 / right 0 / bottom 0 / left 0 px",
		);
		expect(currentDoc().view).toEqual({ padding: { top: 24 } });
	});

	it("takes the whole view field with it once no part is left", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({ kind: "setDocumentView", padding: { top: 24 } });

		const result = apply({ kind: "setDocumentView", padding: null });

		expect(result.text).toBe(
			"the document now declares nothing about how it is presented, so each host frames it its own way",
		);
		expect(currentDoc()).not.toHaveProperty("view");
	});

	it("returns ok:false when no part is given at all", () => {
		const { apply, replacedDocs } = createFakeDocBridge();

		const result = apply({ kind: "setDocumentView" });

		expect(result.ok).toBe(false);
		expect(result.text).toContain("nothing to declare");
		expect(replacedDocs).toHaveLength(0);
	});

	it("returns ok:false on a negative padding side, and leaves the declaration as it was", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({ kind: "setDocumentView", padding: { top: 24 } });

		const result = apply({ kind: "setDocumentView", padding: { left: -1 } });

		expect(result.ok).toBe(false);
		expect(result.text).toContain("view padding left");
		expect(currentDoc().view).toEqual({ padding: { top: 24 } });
	});
});

describe("setMeta", () => {
	it("writes the name and description, and says what the document is now", () => {
		const { apply, currentDoc } = createFakeDocBridge();

		const result = apply({
			kind: "setMeta",
			name: "Overview",
			description: "line 1\nline 2",
		});

		expect(result.ok).toBe(true);
		expect(result.text).toBe(
			'the document is now named "Overview" and described',
		);
		expect(currentDoc().meta).toEqual({
			name: "Overview",
			description: "line 1\nline 2",
		});
	});

	it("keeps a field it is not given, and drops one given as null", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({ kind: "setMeta", name: "Overview", description: "d" });

		apply({ kind: "setMeta", description: null });

		expect(currentDoc().meta).toEqual({ name: "Overview" });
	});

	it("drops meta altogether once nothing is left, and says so", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({ kind: "setMeta", name: "Overview" });

		const result = apply({ kind: "setMeta", name: null });

		expect(result.text).toBe("the document now carries no name or description");
		expect(currentDoc()).not.toHaveProperty("meta");
	});

	it("returns ok:false when neither field is given", () => {
		const { apply, replacedDocs } = createFakeDocBridge();

		const result = apply({ kind: "setMeta" });

		expect(result.ok).toBe(false);
		expect(replacedDocs).toHaveLength(0);
	});

	describe("given an id", () => {
		/** One 100x100 rect, `rect-1`, and nothing else */
		const oneRectDoc = (): CanvasDoc => {
			const doc: CanvasDoc = { version: 1, root: [] };
			docOps.addObject(doc, "rect", { x: 0, y: 0, width: 100, height: 100 });
			return doc;
		};

		it("writes that object's note, names it in what it says, and leaves the document's alone", () => {
			const { apply, currentDoc } = createFakeDocBridge(oneRectDoc());

			const result = apply({
				kind: "setMeta",
				id: "rect-1",
				name: "Gateway",
				description: "d",
			});

			expect(result.ok).toBe(true);
			expect(result.text).toBe('"rect-1" is now named "Gateway" and described');
			expect(currentDoc().root[0]?.meta).toEqual({
				name: "Gateway",
				description: "d",
			});
			expect(currentDoc()).not.toHaveProperty("meta");
		});

		it("drops the object's meta once nothing is left, and says so", () => {
			const { apply, currentDoc } = createFakeDocBridge(oneRectDoc());
			apply({ kind: "setMeta", id: "rect-1", name: "Gateway" });

			const result = apply({ kind: "setMeta", id: "rect-1", name: null });

			expect(result.text).toBe('"rect-1" now carries no name or description');
			expect(currentDoc().root[0]).not.toHaveProperty("meta");
		});

		it("returns ok:false for an id no object carries, and writes nothing", () => {
			const { apply, replacedDocs } = createFakeDocBridge(oneRectDoc());

			const result = apply({ kind: "setMeta", id: "missing", name: "x" });

			expect(result.ok).toBe(false);
			expect(result.text).toContain("object not found: missing");
			expect(replacedDocs).toHaveLength(0);
		});

		it("is taken back by undo", () => {
			const { apply, currentDoc } = createFakeDocBridge(oneRectDoc());
			apply({ kind: "setMeta", id: "rect-1", name: "Gateway" });

			expect(apply({ kind: "undo" }).ok).toBe(true);

			expect(currentDoc().root[0]).not.toHaveProperty("meta");
		});
	});
});

describe("describeCanvas", () => {
	it("puts the document's own fields ahead of root, whatever order the file holds", () => {
		const { apply } = createFakeDocBridge({
			version: 1,
			root: [],
			meta: { name: "Overview" },
		} as unknown as CanvasDoc);

		const result = apply({ kind: "describeCanvas" });

		expect(Object.keys(JSON.parse(result.text) as object)).toEqual([
			"version",
			"meta",
			"root",
		]);
	});
});
