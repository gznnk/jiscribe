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
		apply: (op: AiDocOp) => applyCanvasOp(op, bridge, history, docOps),
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
