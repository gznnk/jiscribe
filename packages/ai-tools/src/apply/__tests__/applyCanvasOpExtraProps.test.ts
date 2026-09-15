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

/** Looks one object up in the document; it does not follow into groups */
const rootObject = (doc: CanvasDoc, id: string): Record<string, unknown> =>
	doc.root.find((object) => object.id === id) as unknown as Record<
		string,
		unknown
	>;

describe("setExtraProps", () => {
	/** A container, the shipped type that carries properties of its own (headerFill / headerHeight) */
	const oneContainer = () => {
		const fake = createFakeDocBridge();
		fake.apply({ kind: "addObject", type: "container", x: 0, y: 0 });
		return fake;
	};

	it("writes the type's own properties, and names them in the order they were given", () => {
		const { apply, currentDoc } = oneContainer();

		const result = apply({
			kind: "setExtraProps",
			id: "container-1",
			extraProps: { headerHeight: 48, headerFill: "#e3f2fd" },
		});

		expect(result.ok).toBe(true);
		expect(result.text).toBe('set headerHeight / headerFill on "container-1"');
		expect(rootObject(currentDoc(), "container-1")).toMatchObject({
			headerHeight: 48,
			headerFill: "#e3f2fd",
		});
	});

	// An optional tool argument that was never filled in arrives as undefined, so
	// a call made entirely of them has to read as "nothing happened" rather than
	// as a write the AI can build on
	it("says every value was empty when nothing was written, and leaves the object untouched", () => {
		const { apply, currentDoc } = oneContainer();
		const containerBeforeOp = structuredClone(
			rootObject(currentDoc(), "container-1"),
		);

		const result = apply({
			kind: "setExtraProps",
			id: "container-1",
			extraProps: { headerHeight: undefined, headerFill: undefined },
		});

		expect(result.ok).toBe(true);
		expect(result.text).toBe(
			'nothing to set on "container-1": every value was empty',
		);
		expect(rootObject(currentDoc(), "container-1")).toEqual(containerBeforeOp);
	});

	it("skips only the empty values when some of them are filled in", () => {
		const { apply, currentDoc } = oneContainer();

		const result = apply({
			kind: "setExtraProps",
			id: "container-1",
			extraProps: { headerHeight: undefined, headerFill: "#e3f2fd" },
		});

		expect(result.text).toBe('set headerFill on "container-1"');
		expect(rootObject(currentDoc(), "container-1")).not.toHaveProperty(
			"headerHeight",
		);
	});

	it("returns ok:false for a name the type does not have, and lists the ones it does", () => {
		const { apply, currentDoc, replacedDocs } = oneContainer();
		const replacedCountBeforeFailure = replacedDocs.length;

		const result = apply({
			kind: "setExtraProps",
			id: "container-1",
			extraProps: { tail: "left" },
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("headerFill");
		expect(rootObject(currentDoc(), "container-1")).not.toHaveProperty("tail");
		expect(replacedDocs).toHaveLength(replacedCountBeforeFailure);
	});

	it("returns ok:false for a value the type's own validator turns away", () => {
		const { apply, currentDoc } = oneContainer();
		apply({
			kind: "setExtraProps",
			id: "container-1",
			extraProps: { headerHeight: 48 },
		});

		const result = apply({
			kind: "setExtraProps",
			id: "container-1",
			extraProps: { headerHeight: 0 },
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("container-1");
		// The write is prepared on a copy, so a rejected value leaves the last good one
		expect(rootObject(currentDoc(), "container-1")).toMatchObject({
			headerHeight: 48,
		});
	});

	it("returns ok:false for an id that does not exist", () => {
		const { apply, replacedDocs } = oneContainer();
		const replacedCountBeforeFailure = replacedDocs.length;

		const result = apply({
			kind: "setExtraProps",
			id: "container-9",
			extraProps: { headerHeight: 48 },
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("container-9");
		expect(replacedDocs).toHaveLength(replacedCountBeforeFailure);
	});

	it("returns ok:false for a name the call takes as a parameter of its own", () => {
		const { apply } = oneContainer();

		const result = apply({
			kind: "setExtraProps",
			id: "container-1",
			extraProps: { type: "rect" },
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("type");
	});
});
