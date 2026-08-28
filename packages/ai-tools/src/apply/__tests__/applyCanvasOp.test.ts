import {
	createCanvasParser,
	createDocOps,
	type CanvasDoc,
	type CanvasDocPlugin,
	type ObjectDoc,
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

describe("applyCanvasOp", () => {
	it("returns JSON from describeCanvas without changing the document", () => {
		const { apply, replacedDocs } = createFakeDocBridge();

		const result = apply({ kind: "describeCanvas" });

		expect(result.ok).toBe(true);
		expect(JSON.parse(result.text)).toEqual({ version: 1, root: [] });
		expect(replacedDocs).toHaveLength(0);
	});

	it("hands a new document object back from addObject (given the same object, Canvas never syncs)", () => {
		const { apply, replacedDocs, currentDoc } = createFakeDocBridge();
		const docBeforeOp = currentDoc();

		const result = apply({
			kind: "addObject",
			type: "rect",
			x: 10,
			y: 20,
			text: "step",
		});

		expect(result.ok).toBe(true);
		expect(replacedDocs).toHaveLength(1);
		expect(replacedDocs[0]).not.toBe(docBeforeOp);
		// The original document is left intact (docOps works in place, so a clone is
		// needed)
		expect(docBeforeOp.root).toHaveLength(0);
		expect(currentDoc().root).toHaveLength(1);
		expect(result.text).toContain("rect-1");
	});

	it("writes the style given to addObject through as it stands", () => {
		const { apply, currentDoc } = createFakeDocBridge();

		apply({
			kind: "addObject",
			type: "rect",
			x: 0,
			y: 0,
			fill: "#e3f2fd",
			fontColor: "#0d47a1",
		});

		expect(rootObject(currentDoc(), "rect-1")).toMatchObject({
			fill: "#e3f2fd",
			fontColor: "#0d47a1",
		});
	});

	it("adds a plugin shape too, catching a doc plugin left unregistered", () => {
		const { apply, currentDoc } = createFakeDocBridge();

		const result = apply({ kind: "addObject", type: "diamond", x: 0, y: 0 });

		expect(result.ok).toBe(true);
		expect(currentDoc().root[0]?.type).toBe("diamond");
	});

	it("adds every addObjects entry at once, and returns the ids in order", () => {
		const { apply, replacedDocs, currentDoc } = createFakeDocBridge();

		const result = apply({
			kind: "addObjects",
			objects: [
				{ type: "stadium", x: 0, y: 0, text: "開始" },
				{ type: "diamond", x: 0, y: 200, fill: "#fff3cd" },
				{ type: "rect", x: 0, y: 400 },
			],
		});

		expect(result.ok).toBe(true);
		expect(result.text).toBe(
			'added 3 objects: stadium "stadium-1", diamond "diamond-1", rect "rect-1"',
		);
		// However many are added, the document is replaced once (so one undo step
		// takes it back)
		expect(replacedDocs).toHaveLength(1);
		expect(currentDoc().root).toHaveLength(3);
		expect(rootObject(currentDoc(), "diamond-1")).toMatchObject({
			fill: "#fff3cd",
		});
	});

	it("adds nothing at all when a single addObjects entry fails", () => {
		const { apply, replacedDocs, currentDoc } = createFakeDocBridge();

		const result = apply({
			kind: "addObjects",
			objects: [
				{ type: "rect", x: 0, y: 0 },
				{ type: "nonexistent", x: 200, y: 0 },
			],
		});

		expect(result.ok).toBe(false);
		// docOps.addObjects reports that it turned every entry down, naming the
		// position of the entry at fault
		expect(result.text).toContain("entries[1]");
		expect(replacedDocs).toHaveLength(0);
		expect(currentDoc().root).toHaveLength(0);
	});

	it("makes what it added into a group of its own with groupNewObjects", () => {
		const { apply, replacedDocs, currentDoc } = createFakeDocBridge();

		const result = apply({
			kind: "addObjects",
			groupNewObjects: true,
			objects: [
				{ type: "rect", x: 0, y: 0 },
				{ type: "rect", x: 200, y: 0 },
			],
		});

		expect(result.ok).toBe(true);
		expect(result.text).toContain('group "group-1"');
		// Adding and grouping replace the document once between them (so one undo
		// step takes it back)
		expect(replacedDocs).toHaveLength(1);
		expect(currentDoc().root.map((object) => object.id)).toEqual(["group-1"]);
	});

	it("adds inside an existing group with parentGroupId", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({
			kind: "addObjects",
			groupNewObjects: true,
			objects: [
				{ type: "rect", x: 0, y: 0 },
				{ type: "rect", x: 200, y: 0 },
			],
		});

		const result = apply({
			kind: "addObjects",
			parentGroupId: "group-1",
			objects: [{ type: "rect", x: 400, y: 0 }],
		});

		expect(result.ok).toBe(true);
		expect(currentDoc().root.map((object) => object.id)).toEqual(["group-1"]);
		expect(
			(rootObject(currentDoc(), "group-1").children as ObjectDoc[]).map(
				(child) => child.id,
			),
		).toEqual(["rect-1", "rect-2", "rect-3"]);
	});

	it("returns ok:false when addObjects is given two homes to add into", () => {
		const { apply, replacedDocs } = createFakeDocBridge();

		const result = apply({
			kind: "addObjects",
			groupNewObjects: true,
			parentGroupId: "group-1",
			objects: [{ type: "rect", x: 0, y: 0 }],
		});

		expect(result.ok).toBe(false);
		expect(replacedDocs).toHaveLength(0);
	});

	it("moves objects into and out of a group with addToGroup / removeFromGroup", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({
			kind: "addObjects",
			groupNewObjects: true,
			objects: [
				{ type: "rect", x: 0, y: 0 },
				{ type: "rect", x: 200, y: 0 },
			],
		});
		apply({ kind: "addObject", type: "rect", x: 400, y: 0 });

		const added = apply({
			kind: "addToGroup",
			groupId: "group-1",
			ids: ["rect-3"],
		});
		expect(added.ok).toBe(true);
		expect(currentDoc().root.map((object) => object.id)).toEqual(["group-1"]);

		const removed = apply({ kind: "removeFromGroup", ids: ["rect-1"] });
		expect(removed.ok).toBe(true);
		expect(currentDoc().root.map((object) => object.id)).toEqual([
			"group-1",
			"rect-1",
		]);
	});

	it("says in the result sentence that taking the last one out took the group with it", () => {
		const { apply } = createFakeDocBridge();
		apply({
			kind: "addObjects",
			groupNewObjects: true,
			objects: [
				{ type: "rect", x: 0, y: 0 },
				{ type: "rect", x: 200, y: 0 },
			],
		});

		const result = apply({
			kind: "removeFromGroup",
			ids: ["rect-1", "rect-2"],
		});

		expect(result.ok).toBe(true);
		expect(result.text).toContain("group-1");
	});

	it("joins two objects that were already added", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({ kind: "addObject", type: "rect", x: 0, y: 0 });
		apply({ kind: "addObject", type: "rect", x: 300, y: 0 });

		const result = apply({
			kind: "connect",
			sourceId: "rect-1",
			targetId: "rect-2",
			endArrow: "FilledTriangle",
			label: "yes",
		});

		expect(result.ok).toBe(true);
		expect(currentDoc().root).toHaveLength(3);
		expect(rootObject(currentDoc(), "connector-1")).toMatchObject({
			type: "connector",
			label: { text: "yes" },
		});
	});

	it("returns ok:false on a type it does not know, and leaves the document alone", () => {
		const { apply, replacedDocs } = createFakeDocBridge();

		const result = apply({
			kind: "addObject",
			type: "nonexistent",
			x: 0,
			y: 0,
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("nonexistent");
		expect(replacedDocs).toHaveLength(0);
	});

	// A document the AI made goes through the parser when it is saved to a file
	// and when a draft is restored. Break this and the result is a drawing that
	// was drawn but cannot be opened again
	it("builds a document that goes through the parser", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({ kind: "addObject", type: "stadium", x: 0, y: 0, text: "開始" });
		apply({ kind: "addObject", type: "diamond", x: 0, y: 200 });
		apply({
			kind: "connect",
			sourceId: "stadium-1",
			targetId: "diamond-1",
			sourceAnchor: "bottomCenter",
			targetAnchor: "topCenter",
			endArrow: "FilledTriangle",
			label: "はい",
		});
		apply({ kind: "setStyle", ids: ["diamond-1"], style: { fill: "#fff3cd" } });
		apply({ kind: "setText", id: "diamond-1", text: "2FA 有効？" });
		apply({ kind: "setPosition", id: "diamond-1", x: 40 });

		const parseResult = createCanvasParser({ plugins: docPlugins }).parse(
			JSON.stringify(currentDoc()),
		);

		expect(parseResult.kind).toBe("ok");
	});

	it("returns ok:false for a connect to an id that does not exist", () => {
		const { apply, replacedDocs } = createFakeDocBridge();

		const result = apply({
			kind: "connect",
			sourceId: "rect-1",
			targetId: "rect-2",
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("rect-1");
		expect(replacedDocs).toHaveLength(0);
	});

	it("puts the connectors that went with them into the deleteObjects result sentence", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({ kind: "addObject", type: "rect", x: 0, y: 0 });
		apply({ kind: "addObject", type: "rect", x: 300, y: 0 });
		apply({ kind: "connect", sourceId: "rect-1", targetId: "rect-2" });

		const result = apply({ kind: "deleteObjects", ids: ["rect-2"] });

		expect(result.ok).toBe(true);
		expect(result.text).toContain("connector-1");
		expect(currentDoc().root.map((object) => object.id)).toEqual(["rect-1"]);
	});

	it("names in the result sentence the properties the type would not take", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({ kind: "addObject", type: "rect", x: 0, y: 0 });
		apply({ kind: "addObject", type: "rect", x: 300, y: 0 });
		apply({ kind: "connect", sourceId: "rect-1", targetId: "rect-2" });

		const result = apply({
			kind: "setStyle",
			ids: ["connector-1"],
			style: { stroke: "#c62828", fill: "#ffffff" },
		});

		expect(result.ok).toBe(true);
		expect(result.text).toContain("fill");
		expect(rootObject(currentDoc(), "connector-1")).toMatchObject({
			stroke: "#c62828",
		});
	});
});

describe("operations that change where things sit", () => {
	/** A document with three 100x100 rects laid out across, with gaps between them */
	const threeRects = () => {
		const fake = createFakeDocBridge();
		for (const x of [0, 200, 500]) {
			fake.apply({
				kind: "addObject",
				type: "rect",
				x,
				y: 0,
				width: 100,
				height: 100,
			});
		}
		return fake;
	};

	it("writes an axis left out of setPosition as unchanged in the result sentence", () => {
		const { apply, currentDoc } = threeRects();

		const result = apply({ kind: "setPosition", id: "rect-1", y: 300 });

		expect(result.text).toBe('moved "rect-1" to (unchanged, 300)');
		expect(rootObject(currentDoc(), "rect-1")).toMatchObject({ x: 0, y: 300 });
	});

	it("shifts them together and keeps the gaps between the shapes", () => {
		const { apply, currentDoc } = threeRects();

		const result = apply({
			kind: "translateObjects",
			ids: ["rect-1", "rect-2"],
			deltaX: 50,
			deltaY: -10,
		});

		expect(result.ok).toBe(true);
		expect(rootObject(currentDoc(), "rect-1")).toMatchObject({ x: 50, y: -10 });
		expect(rootObject(currentDoc(), "rect-2")).toMatchObject({
			x: 250,
			y: -10,
		});
	});

	it("writes an axis left out of resizeObject as unchanged in the result sentence", () => {
		const { apply, currentDoc } = threeRects();

		const result = apply({ kind: "resizeObject", id: "rect-1", width: 240 });

		expect(result.text).toBe('resized "rect-1" to 240 x unchanged');
		expect(rootObject(currentDoc(), "rect-1")).toMatchObject({
			width: 240,
			height: 100,
		});
	});

	it("drops height from the document on setHeightMode auto", () => {
		const { apply, currentDoc } = threeRects();

		const result = apply({
			kind: "setHeightMode",
			ids: ["rect-1"],
			mode: "auto",
		});

		expect(result.ok).toBe(true);
		expect(rootObject(currentDoc(), "rect-1")).not.toHaveProperty("height");
	});

	it("writes the height given back on setHeightMode fixed", () => {
		const { apply, currentDoc } = threeRects();
		apply({ kind: "setHeightMode", ids: ["rect-1"], mode: "auto" });

		const result = apply({
			kind: "setHeightMode",
			ids: ["rect-1"],
			mode: "fixed",
			height: 160,
		});

		expect(result.text).toBe('set the height of "rect-1" to 160');
		expect(rootObject(currentDoc(), "rect-1")).toMatchObject({ height: 160 });
	});

	// The tool declaration leaves height optional, so this pins down how a fixed
	// mode missing one is refused
	it("refuses setHeightMode fixed with no height", () => {
		const { apply } = threeRects();

		const result = apply({
			kind: "setHeightMode",
			ids: ["rect-1"],
			mode: "fixed",
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("a fixed height needs the height to write");
	});

	it("moves one axis only with alignObjects / distributeObjects", () => {
		const { apply, currentDoc } = threeRects();
		apply({ kind: "setPosition", id: "rect-2", y: 40 });

		expect(
			apply({ kind: "alignObjects", ids: ["rect-1", "rect-2"], edge: "top" }),
		).toMatchObject({ ok: true });
		expect(rootObject(currentDoc(), "rect-2")).toMatchObject({ x: 200, y: 0 });

		const spread = apply({
			kind: "distributeObjects",
			ids: ["rect-1", "rect-2", "rect-3"],
			axis: "horizontal",
			spacing: 20,
		});

		expect(spread.text).toContain("horizontally");
		expect(rootObject(currentDoc(), "rect-2")).toMatchObject({ x: 120 });
		expect(rootObject(currentDoc(), "rect-3")).toMatchObject({ x: 240 });
	});

	it("never replaces the document on a failed operation, so nothing half-drawn is left behind", () => {
		const { apply, replacedDocs } = threeRects();
		const replacedCountBeforeFailure = replacedDocs.length;

		const result = apply({
			kind: "translateObjects",
			ids: ["rect-1", "rect-9"],
			deltaX: 10,
			deltaY: 0,
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("rect-9");
		expect(replacedDocs).toHaveLength(replacedCountBeforeFailure);
	});
});

describe("operations that fix up text and connectors", () => {
	const connectedPair = () => {
		const fake = createFakeDocBridge();
		fake.apply({ kind: "addObject", type: "rect", x: 0, y: 0 });
		fake.apply({ kind: "addObject", type: "rect", x: 300, y: 0 });
		fake.apply({ kind: "connect", sourceId: "rect-1", targetId: "rect-2" });
		return fake;
	};

	it("tells clearing with an empty string apart in what it writes", () => {
		const { apply } = connectedPair();

		expect(apply({ kind: "setText", id: "rect-1", text: "開始" }).text).toBe(
			'set the text of "rect-1" to "開始"',
		);
		expect(apply({ kind: "setText", id: "rect-1", text: "" }).text).toBe(
			'cleared the text of "rect-1"',
		);
	});

	it("writes a re-attached end into the document", () => {
		const { apply, currentDoc } = connectedPair();
		apply({ kind: "addObject", type: "rect", x: 600, y: 0 });

		const result = apply({
			kind: "updateConnector",
			id: "connector-1",
			targetId: "rect-3",
			targetAnchor: "leftCenter",
		});

		expect(result.ok).toBe(true);
		expect(rootObject(currentDoc(), "connector-1")).toMatchObject({
			target: { owner: { id: "rect-3" } },
		});
	});

	it("returns ok:false for an updateConnector aimed at something that is not a connector", () => {
		const { apply, replacedDocs } = connectedPair();
		const replacedCountBeforeFailure = replacedDocs.length;

		const result = apply({
			kind: "updateConnector",
			id: "rect-1",
			targetId: "rect-2",
		});

		expect(result.ok).toBe(false);
		expect(replacedDocs).toHaveLength(replacedCountBeforeFailure);
	});
});

describe("operations that change rotation, vertices and stacking order", () => {
	/** A document holding one rect and one polyline; the polyline stands for the types that do not turn */
	const rectAndPolyline = () => {
		const fake = createFakeDocBridge();
		fake.apply({ kind: "addObject", type: "rect", x: 0, y: 0 });
		fake.apply({ kind: "addObject", type: "polyline", x: 300, y: 0 });
		return fake;
	};

	it("writes the ids it turned and the angle into the result sentence", () => {
		const { apply, currentDoc } = rectAndPolyline();

		const result = apply({
			kind: "setRotation",
			ids: ["rect-1"],
			rotation: 45,
		});

		expect(result.ok).toBe(true);
		expect(result.text).toBe('turned "rect-1" to 45°');
		expect(rootObject(currentDoc(), "rect-1")).toMatchObject({ rotation: 45 });
	});

	// Lets the AI notice that it meant to turn something and nothing turned
	it("puts the ids that did not turn into the result sentence", () => {
		const { apply, currentDoc } = rectAndPolyline();

		const result = apply({
			kind: "setRotation",
			ids: ["rect-1", "polyline-1"],
			rotation: 90,
		});

		expect(result.ok).toBe(true);
		expect(result.text).toBe(
			'turned "rect-1" to 90° ("polyline-1" stayed as they were: their type has no rotation)',
		);
		expect(rootObject(currentDoc(), "polyline-1")).not.toHaveProperty(
			"rotation",
		);
	});

	it("says as much when nothing turned at all", () => {
		const { apply } = rectAndPolyline();

		const result = apply({
			kind: "setRotation",
			ids: ["polyline-1"],
			rotation: 90,
		});

		expect(result.ok).toBe(true);
		expect(result.text).toBe(
			'nothing turned: none of "polyline-1" has a rotation of its own',
		);
	});

	it("returns ok:false for a setRotation given something that is not an angle", () => {
		const { apply, replacedDocs } = rectAndPolyline();
		const replacedCountBeforeFailure = replacedDocs.length;

		const result = apply({
			kind: "setRotation",
			ids: ["rect-1"],
			rotation: Number.NaN,
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("finite");
		expect(replacedDocs).toHaveLength(replacedCountBeforeFailure);
	});

	it("replaces the vertices wholesale", () => {
		const { apply, currentDoc } = rectAndPolyline();

		const result = apply({
			kind: "setPoints",
			id: "polyline-1",
			points: [
				{ x: 0, y: 0 },
				{ x: 40, y: 80 },
				{ x: 120, y: 20 },
			],
		});

		expect(result.ok).toBe(true);
		expect(result.text).toBe('reshaped "polyline-1" to 3 vertices');
		expect(rootObject(currentDoc(), "polyline-1").points).toEqual([
			{ x: 0, y: 0 },
			{ x: 40, y: 80 },
			{ x: 120, y: 20 },
		]);
	});

	it("returns ok:false for a setPoints aimed at a type that has no vertices", () => {
		const { apply, replacedDocs } = rectAndPolyline();
		const replacedCountBeforeFailure = replacedDocs.length;

		const result = apply({
			kind: "setPoints",
			id: "rect-1",
			points: [
				{ x: 0, y: 0 },
				{ x: 10, y: 10 },
			],
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("rect-1");
		expect(replacedDocs).toHaveLength(replacedCountBeforeFailure);
	});

	it("makes a poly of whatever shape is wanted from points on addObject", () => {
		const { apply, currentDoc } = createFakeDocBridge();

		const result = apply({
			kind: "addObject",
			type: "polygon",
			x: 999,
			y: 999,
			points: [
				{ x: 0, y: 0 },
				{ x: 60, y: 0 },
				{ x: 30, y: 50 },
			],
			rotation: 30,
		});

		expect(result.ok).toBe(true);
		// x / y are ignored, and the vertices are the shape as they stand
		expect(rootObject(currentDoc(), "polygon-1").points).toEqual([
			{ x: 0, y: 0 },
			{ x: 60, y: 0 },
			{ x: 30, y: 50 },
		]);
		// A poly does not turn, so no rotation is written
		expect(rootObject(currentDoc(), "polygon-1")).not.toHaveProperty(
			"rotation",
		);
	});

	it("writes where they went into the result sentence, and restacks them within their parent", () => {
		const { apply, currentDoc } = rectAndPolyline();
		apply({ kind: "addObject", type: "rect", x: 600, y: 0 });

		const result = apply({
			kind: "reorderObjects",
			ids: ["rect-1"],
			placement: "front",
		});

		expect(result.ok).toBe(true);
		expect(result.text).toBe('restacked "rect-1" to the front');
		expect(currentDoc().root.map((object) => object.id)).toEqual([
			"polyline-1",
			"rect-2",
			"rect-1",
		]);

		const stepped = apply({
			kind: "reorderObjects",
			ids: ["rect-1"],
			placement: "backward",
		});

		expect(stepped.text).toBe('restacked "rect-1" one step backward');
		expect(currentDoc().root.map((object) => object.id)).toEqual([
			"polyline-1",
			"rect-1",
			"rect-2",
		]);
	});

	it("returns ok:false for a reorderObjects on an id that does not exist", () => {
		const { apply, replacedDocs } = rectAndPolyline();
		const replacedCountBeforeFailure = replacedDocs.length;

		const result = apply({
			kind: "reorderObjects",
			ids: ["rect-9"],
			placement: "back",
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("rect-9");
		expect(replacedDocs).toHaveLength(replacedCountBeforeFailure);
	});
});

describe("connectors with a free end", () => {
	it("writes the coordinate into the result sentence when one end of connect is one", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({ kind: "addObject", type: "rect", x: 0, y: 0 });

		const result = apply({
			kind: "connect",
			sourceId: "rect-1",
			targetPoint: { x: 400, y: 120 },
		});

		expect(result.ok).toBe(true);
		expect(result.text).toBe(
			'connected "rect-1" → (400, 120) as "connector-1"',
		);
		expect(rootObject(currentDoc(), "connector-1")).toMatchObject({
			source: { owner: { id: "rect-1" } },
		});
	});

	// A line with both ends loose is a polyline's job; the document model refuses
	// it as a connector
	it("returns ok:false for a connect with a coordinate at both ends", () => {
		const { apply, replacedDocs } = createFakeDocBridge();

		const result = apply({
			kind: "connect",
			sourcePoint: { x: 0, y: 0 },
			targetPoint: { x: 100, y: 100 },
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("polyline");
		expect(replacedDocs).toHaveLength(0);
	});

	it("detaches an end that was attached, onto a coordinate", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({ kind: "addObject", type: "rect", x: 0, y: 0 });
		apply({ kind: "addObject", type: "rect", x: 300, y: 0 });
		apply({ kind: "connect", sourceId: "rect-1", targetId: "rect-2" });

		const result = apply({
			kind: "updateConnector",
			id: "connector-1",
			targetPoint: { x: 500, y: 300 },
		});

		expect(result.ok).toBe(true);
		expect(rootObject(currentDoc(), "connector-1")).toMatchObject({
			target: { anchor: { kind: "free" } },
		});
	});
});

describe("operations that rearrange groups", () => {
	const twoRects = () => {
		const fake = createFakeDocBridge();
		fake.apply({ kind: "addObject", type: "rect", x: 0, y: 0 });
		fake.apply({ kind: "addObject", type: "rect", x: 300, y: 0 });
		return fake;
	};

	it("has groupObjects and dissolveGroup cancel each other out", () => {
		const { apply, currentDoc } = twoRects();

		const grouped = apply({
			kind: "groupObjects",
			ids: ["rect-1", "rect-2"],
		});

		expect(grouped.text).toContain('as "group-1"');
		expect(currentDoc().root.map((object) => object.id)).toEqual(["group-1"]);

		const dissolved = apply({ kind: "dissolveGroup", id: "group-1" });

		expect(dissolved.text).toContain('"rect-1", "rect-2"');
		expect(currentDoc().root.map((object) => object.id)).toEqual([
			"rect-1",
			"rect-2",
		]);
	});

	it("adds at the front when addObjects is given no home", () => {
		const { apply, currentDoc } = twoRects();

		const result = apply({
			kind: "addObjects",
			objects: [
				{ type: "rect", x: 600, y: 0 },
				{ type: "ellipse", x: 900, y: 0 },
			],
		});

		expect(result.text).toBe(
			'added 2 objects: rect "rect-3", ellipse "ellipse-1"',
		);
		expect(currentDoc().root).toHaveLength(4);
	});
});

describe("operations that read the drawing", () => {
	/** A document with two rects and a connector between them, plus one group apart from those */
	const readableDoc = () => {
		const fake = createFakeDocBridge();
		fake.apply({
			kind: "addObjects",
			objects: [
				{ type: "rect", x: 0, y: 0, width: 120, height: 80, text: "Login" },
				{ type: "rect", x: 300, y: 0, width: 120, height: 80, text: "Home" },
			],
		});
		fake.apply({ kind: "connect", sourceId: "rect-1", targetId: "rect-2" });
		fake.apply({
			kind: "addObjects",
			groupNewObjects: true,
			objects: [
				{ type: "ellipse", x: 0, y: 300 },
				{ type: "ellipse", x: 300, y: 300 },
			],
		});
		return fake;
	};

	/**
	 * Reads back the JSON body on the end of a result text. The JSON is always one
	 * line, so however many lines of heading or truncation note come before it, it
	 * can be taken from after the last newline
	 */
	const parseTrailingJson = (text: string): unknown =>
		JSON.parse(text.slice(text.lastIndexOf("\n") + 1));

	it("lists what is inside groups flat as well, and does not replace the document", () => {
		const { apply, replacedDocs } = readableDoc();
		const replacedCountBeforeRead = replacedDocs.length;

		const result = apply({ kind: "listObjects" });

		expect(result.ok).toBe(true);
		expect(result.text).toContain("6 object(s)");
		expect(parseTrailingJson(result.text)).toMatchObject([
			{ id: "rect-1", type: "rect", parentId: null, text: "Login" },
			{ id: "rect-2" },
			{ id: "connector-1", bounds: null },
			{ id: "group-1", parentId: null },
			{ id: "ellipse-1", parentId: "group-1" },
			{ id: "ellipse-2", parentId: "group-1" },
		]);
		// A read touches neither the undo history nor the document
		expect(replacedDocs).toHaveLength(replacedCountBeforeRead);
	});

	it("says outright that an empty canvas is empty", () => {
		const { apply } = createFakeDocBridge();

		const result = apply({ kind: "listObjects" });

		expect(result.ok).toBe(true);
		expect(result.text).toBe("the canvas is empty: it holds no objects at all");
	});

	// When the summaries grow too big, the cut has to leave JSON the AI can still
	// read back
	it("shows fewer entries once it is over the budget, and points at narrowing the search", () => {
		const { apply } = createFakeDocBridge();
		apply({
			kind: "addObjects",
			objects: Array.from({ length: 400 }, (_unused, index) => ({
				type: "rect",
				x: index * 200,
				y: 0,
				width: 120,
				height: 80,
			})),
		});

		const result = apply({ kind: "listObjects" });

		expect(result.ok).toBe(true);
		expect(result.text).toContain("400 object(s)");
		expect(result.text).toContain("of 400 objects");
		expect(result.text).toContain("find_objects");
		const shown = parseTrailingJson(result.text);
		expect(Array.isArray(shown)).toBe(true);
		expect((shown as unknown[]).length).toBeGreaterThan(0);
		expect((shown as unknown[]).length).toBeLessThan(400);
	});

	it("returns only what meets the conditions", () => {
		const { apply } = readableDoc();

		const result = apply({ kind: "findObjects", type: "rect", text: "login" });

		expect(result.ok).toBe(true);
		expect(result.text).toContain("1 match(es)");
		expect(parseTrailingJson(result.text)).toMatchObject([{ id: "rect-1" }]);
	});

	// No results means nothing meets the conditions, which is not a failure
	it("returns ok:true on no findObjects results, and adds how to loosen the conditions", () => {
		const { apply, replacedDocs } = readableDoc();
		const replacedCountBeforeRead = replacedDocs.length;

		const result = apply({ kind: "findObjects", type: "rect", text: "Signup" });

		expect(result.ok).toBe(true);
		expect(result.text).toBe(
			"no object matches: the canvas holds 6 object(s), and every condition you gave has to hold at once, so drop one of them or widen it",
		);
		expect(replacedDocs).toHaveLength(replacedCountBeforeRead);
	});

	it("returns ok:false when the inGroup of findObjects is not a group", () => {
		const { apply } = readableDoc();

		const result = apply({ kind: "findObjects", inGroup: "rect-1" });

		expect(result.ok).toBe(false);
		expect(result.text).toContain("rect-1");
	});

	it("returns one object whole, as JSON", () => {
		const { apply } = readableDoc();

		const result = apply({ kind: "getObject", id: "rect-1" });

		expect(result.ok).toBe(true);
		expect(parseTrailingJson(result.text)).toMatchObject({
			id: "rect-1",
			type: "rect",
			x: 0,
			y: 0,
			width: 120,
			height: 80,
		});
	});

	// An id that is not in the document is a failure, and has to be tellable apart
	// from no results and from null
	it("returns ok:false for a getObject on an id that does not exist", () => {
		const { apply } = readableDoc();

		const result = apply({ kind: "getObject", id: "rect-9" });

		expect(result.ok).toBe(false);
		expect(result.text).toContain("rect-9");
	});

	it("writes down to the right and bottom edges, and says so for a type it cannot measure", () => {
		const { apply } = readableDoc();

		expect(apply({ kind: "getObjectBounds", id: "rect-2" }).text).toBe(
			'"rect-2" occupies (300, 0) 120 x 80 px, so the right edge is x 420 and the bottom edge y 80',
		);

		const connector = apply({ kind: "getObjectBounds", id: "connector-1" });

		expect(connector.ok).toBe(true);
		expect(connector.text).toContain("no box of its own");
	});

	it("measures the whole drawing when getCombinedBounds is given no ids", () => {
		const { apply } = readableDoc();

		const whole = apply({ kind: "getCombinedBounds" });

		expect(whole.text).toBe(
			"the whole drawing occupies (0, 0) 420 x 400 px, so the right edge is x 420 and the bottom edge y 400",
		);
		expect(
			apply({ kind: "getCombinedBounds", ids: ["rect-1"] }).text,
		).toContain('"rect-1" together occupy');
		expect(apply({ kind: "getCombinedBounds", ids: ["connector-1"] }).ok).toBe(
			true,
		);
	});

	it("reports an object with no text as holding none, not as holding an empty string", () => {
		const { apply } = readableDoc();

		expect(apply({ kind: "getText", id: "rect-1" }).text).toBe(
			'the text of "rect-1" is "Login"',
		);
		expect(apply({ kind: "getText", id: "ellipse-1" }).text).toContain(
			"holds no text",
		);
	});

	it("says reordering would change nothing when it is already at the front", () => {
		const { apply } = readableDoc();

		const front = apply({ kind: "getZOrder", id: "group-1" });

		expect(front.ok).toBe(true);
		expect(front.text).toContain("index 3 of 4 sibling(s)");
		expect(front.text).toContain("already drawn over its siblings");
		expect(apply({ kind: "getZOrder", id: "ellipse-1" }).text).toContain(
			"index 0 of 2 sibling(s)",
		);
	});

	// A null directly under root means it is in no group, not a failure
	it("returns ok:true from getParentGroup for something directly under root", () => {
		const { apply } = readableDoc();

		const atRoot = apply({ kind: "getParentGroup", id: "rect-1" });

		expect(atRoot.ok).toBe(true);
		expect(atRoot.text).toBe(
			'"rect-1" sits at the top level of the canvas, in no group',
		);
		expect(apply({ kind: "getParentGroup", id: "ellipse-1" }).text).toBe(
			'"ellipse-1" is held by group "group-1"',
		);
	});

	it("returns only the direct children, in drawing order", () => {
		const { apply } = readableDoc();

		const result = apply({ kind: "getGroupMembers", groupId: "group-1" });

		expect(result.ok).toBe(true);
		expect(result.text).toContain('"ellipse-1", "ellipse-2"');
		expect(apply({ kind: "getGroupMembers", groupId: "rect-1" }).ok).toBe(
			false,
		);
	});

	it("returns ok:true on no results from getConnectors / getConnectedObjects", () => {
		const { apply } = readableDoc();

		expect(apply({ kind: "getConnectors", id: "rect-1" }).text).toContain(
			'"connector-1"',
		);
		expect(apply({ kind: "getConnectedObjects", id: "rect-1" }).text).toContain(
			'"rect-2"',
		);

		const lonely = apply({ kind: "getConnectors", id: "ellipse-1" });

		expect(lonely.ok).toBe(true);
		expect(lonely.text).toBe('no connector has an end on "ellipse-1"');
		expect(
			apply({ kind: "getConnectedObjects", id: "ellipse-1" }).text,
		).toContain("reaches no other object");
	});

	it("lists the types with no document to go on", () => {
		const { apply } = createFakeDocBridge();

		const result = apply({ kind: "listTypes" });

		expect(result.ok).toBe(true);
		expect(parseTrailingJson(result.text)).toContainEqual({
			type: "rect",
			creatable: true,
			connectable: true,
			text: "single",
			geometry: "rect",
			summary: "general-purpose node / label box",
		});
	});
});

describe("the batch operations", () => {
	/** A document with three 100x100 rects lined up across */
	const threeRects = () => {
		const fake = createFakeDocBridge();
		fake.apply({
			kind: "addObjects",
			objects: [0, 200, 500].map((x) => ({
				type: "rect",
				x,
				y: 0,
				width: 100,
				height: 100,
			})),
		});
		return fake;
	};

	it("draws every connectMany entry at once, and returns the ids in order", () => {
		const { apply, replacedDocs, currentDoc } = threeRects();
		const replacedCountBeforeOp = replacedDocs.length;

		const result = apply({
			kind: "connectMany",
			entries: [
				{ sourceId: "rect-1", targetId: "rect-2" },
				{ sourceId: "rect-2", targetPoint: { x: 900, y: 50 } },
			],
		});

		expect(result.ok).toBe(true);
		expect(result.text).toBe(
			'connected 2 connector(s): "rect-1" → "rect-2" as "connector-1", "rect-2" → (900, 50) as "connector-2"',
		);
		// However many are drawn, the document is replaced once (so one undo step
		// takes it back)
		expect(replacedDocs).toHaveLength(replacedCountBeforeOp + 1);
		expect(currentDoc().root).toHaveLength(5);
	});

	it("draws not one line when a single connectMany entry is turned away", () => {
		const { apply, replacedDocs, currentDoc } = threeRects();
		const replacedCountBeforeFailure = replacedDocs.length;

		const result = apply({
			kind: "connectMany",
			entries: [
				{ sourceId: "rect-1", targetId: "rect-2" },
				{ sourceId: "rect-1", targetId: "rect-9" },
			],
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("entries[1]");
		expect(replacedDocs).toHaveLength(replacedCountBeforeFailure);
		expect(currentDoc().root).toHaveLength(3);
	});

	it("puts each entry at its own absolute coordinate, and tells an axis left out apart in what it writes", () => {
		const { apply, currentDoc } = threeRects();

		const result = apply({
			kind: "setPositions",
			entries: [
				{ id: "rect-1", x: 10, y: 20 },
				{ id: "rect-2", y: 300 },
			],
		});

		expect(result.text).toBe(
			'moved 2 object(s): "rect-1" to (10, 20), "rect-2" to (unchanged, 300)',
		);
		expect(rootObject(currentDoc(), "rect-1")).toMatchObject({ x: 10, y: 20 });
		expect(rootObject(currentDoc(), "rect-2")).toMatchObject({
			x: 200,
			y: 300,
		});
	});

	it("moves not one object when a single setPositions entry is turned away", () => {
		const { apply, replacedDocs, currentDoc } = threeRects();
		const replacedCountBeforeFailure = replacedDocs.length;

		const result = apply({
			kind: "setPositions",
			entries: [
				{ id: "rect-1", x: 10, y: 20 },
				{ id: "rect-9", x: 0, y: 0 },
			],
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("rect-9");
		expect(replacedDocs).toHaveLength(replacedCountBeforeFailure);
		expect(rootObject(currentDoc(), "rect-1")).toMatchObject({ x: 0, y: 0 });
	});

	it("gives every id the same size, leaving an axis left out as each object's own", () => {
		const { apply, currentDoc } = threeRects();
		apply({ kind: "resizeObject", id: "rect-2", height: 40 });

		const result = apply({
			kind: "resizeObjects",
			ids: ["rect-1", "rect-2"],
			width: 240,
		});

		expect(result.text).toBe(
			'resized "rect-1", "rect-2" to 240 x unchanged each',
		);
		expect(rootObject(currentDoc(), "rect-1")).toMatchObject({
			width: 240,
			height: 100,
		});
		expect(rootObject(currentDoc(), "rect-2")).toMatchObject({
			width: 240,
			height: 40,
		});
	});

	it("puts a different outline into each shape", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({
			kind: "addObjects",
			objects: [
				{ type: "polyline", x: 0, y: 0 },
				{ type: "polygon", x: 0, y: 300 },
			],
		});

		const result = apply({
			kind: "setPointsMany",
			entries: [
				{
					id: "polyline-1",
					points: [
						{ x: 0, y: 0 },
						{ x: 40, y: 80 },
					],
				},
				{
					id: "polygon-1",
					points: [
						{ x: 0, y: 300 },
						{ x: 60, y: 300 },
						{ x: 30, y: 350 },
					],
				},
			],
		});

		expect(result.text).toBe(
			'reshaped 2 shape(s): "polyline-1" to 2 vertices, "polygon-1" to 3 vertices',
		);
		expect(rootObject(currentDoc(), "polygon-1").points).toHaveLength(3);
	});

	it("reshapes not one shape when a single setPointsMany entry is turned away", () => {
		const { apply, replacedDocs, currentDoc } = createFakeDocBridge();
		apply({ kind: "addObject", type: "polyline", x: 0, y: 0 });
		apply({ kind: "addObject", type: "rect", x: 0, y: 300 });
		const pointsBeforeFailure = rootObject(currentDoc(), "polyline-1").points;
		const replacedCountBeforeFailure = replacedDocs.length;

		const result = apply({
			kind: "setPointsMany",
			entries: [
				{
					id: "polyline-1",
					points: [
						{ x: 0, y: 0 },
						{ x: 40, y: 80 },
					],
				},
				// A type with no vertices; this is what gets turned away
				{
					id: "rect-1",
					points: [
						{ x: 0, y: 0 },
						{ x: 10, y: 10 },
					],
				},
			],
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("entries[1]");
		expect(replacedDocs).toHaveLength(replacedCountBeforeFailure);
		expect(rootObject(currentDoc(), "polyline-1").points).toEqual(
			pointsBeforeFailure,
		);
	});

	it("tells slots and clearing with an empty string apart in what it writes", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({
			kind: "addObjects",
			objects: [
				{ type: "rect", x: 0, y: 0, text: "old" },
				{ type: "rect", x: 300, y: 0, text: "keep" },
				{ type: "record", x: 600, y: 0 },
			],
		});

		const result = apply({
			kind: "setTexts",
			entries: [
				{ id: "rect-1", text: "開始" },
				{ id: "rect-2", text: "" },
				{ id: "record-1", text: "User", slot: "name" },
			],
		});

		expect(result.text).toBe(
			'set the text of 3 object(s): "rect-1" to "開始", "rect-2" cleared, slot "name" of "record-1" to "User"',
		);
		expect(rootObject(currentDoc(), "rect-1").text).toBe("開始");
		expect(rootObject(currentDoc(), "rect-2").text).toBe("");
	});

	it("writes not one object when a single setTexts entry is turned away", () => {
		const { apply, replacedDocs, currentDoc } = threeRects();
		const replacedCountBeforeFailure = replacedDocs.length;

		const result = apply({
			kind: "setTexts",
			entries: [
				{ id: "rect-1", text: "開始" },
				{ id: "rect-9", text: "終了" },
			],
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("entries[1]");
		expect(replacedDocs).toHaveLength(replacedCountBeforeFailure);
		expect(rootObject(currentDoc(), "rect-1").text).toBe("");
	});

	it("re-attaches the ends of every entry in one go", () => {
		const { apply, currentDoc } = threeRects();
		apply({
			kind: "connectMany",
			entries: [
				{ sourceId: "rect-1", targetId: "rect-2" },
				{ sourceId: "rect-1", targetId: "rect-3" },
			],
		});

		const result = apply({
			kind: "updateConnectors",
			entries: [
				{ id: "connector-1", sourceAnchor: "rightCenter" },
				{ id: "connector-2", endArrow: "FilledTriangle" },
			],
		});

		expect(result.text).toBe(
			'updated 2 connector(s): "connector-1", "connector-2"',
		);
		expect(rootObject(currentDoc(), "connector-2")).toMatchObject({
			endArrow: "FilledTriangle",
		});
	});

	it("returns ok:false for an updateConnectors naming the same id twice", () => {
		const { apply, replacedDocs } = threeRects();
		apply({
			kind: "connectMany",
			entries: [{ sourceId: "rect-1", targetId: "rect-2" }],
		});
		const replacedCountBeforeFailure = replacedDocs.length;

		const result = apply({
			kind: "updateConnectors",
			entries: [
				{ id: "connector-1", sourceAnchor: "rightCenter" },
				{ id: "connector-1", targetAnchor: "leftCenter" },
			],
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("connector-1");
		expect(replacedDocs).toHaveLength(replacedCountBeforeFailure);
	});

	it("dissolves nested groups together too, and returns the ids released", () => {
		const { apply, currentDoc } = threeRects();
		apply({ kind: "groupObjects", ids: ["rect-1", "rect-2"] });
		apply({ kind: "groupObjects", ids: ["group-1", "rect-3"] });

		const result = apply({
			kind: "dissolveGroups",
			ids: ["group-2", "group-1"],
		});

		expect(result.text).toBe(
			'dissolved "group-2", "group-1", releasing "rect-3", "rect-1", "rect-2"',
		);
		expect(currentDoc().root.map((object) => object.id)).toEqual([
			"rect-1",
			"rect-2",
			"rect-3",
		]);
	});

	it("dissolves not one group when a dissolveGroups mixes in an id that is not one", () => {
		const { apply, replacedDocs, currentDoc } = threeRects();
		apply({ kind: "groupObjects", ids: ["rect-1", "rect-2"] });
		const replacedCountBeforeFailure = replacedDocs.length;

		const result = apply({
			kind: "dissolveGroups",
			ids: ["group-1", "rect-3"],
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("rect-3");
		expect(replacedDocs).toHaveLength(replacedCountBeforeFailure);
		expect(currentDoc().root.map((object) => object.id)).toEqual([
			"group-1",
			"rect-3",
		]);
	});

	it("decorates only where the body text matches", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({
			kind: "addObject",
			type: "rect",
			x: 0,
			y: 0,
			text: "warning: check warning",
		});

		const result = apply({
			kind: "setTextStyle",
			id: "rect-1",
			match: "warning",
			occurrence: 1,
			fontWeight: "bold",
			fontColor: "#c62828",
		});

		expect(result.text).toBe('styled occurrence 1 of "warning" in "rect-1"');
		expect(rootObject(currentDoc(), "rect-1").text).toEqual([
			{ text: "warning", fontColor: "#c62828", fontWeight: "bold" },
			{ text: ": check warning" },
		]);
	});

	it("returns ok:false on a setTextStyle that matches nothing, and leaves the document alone", () => {
		const { apply, replacedDocs, currentDoc } = createFakeDocBridge();
		apply({ kind: "addObject", type: "rect", x: 0, y: 0, text: "hello" });
		const replacedCountBeforeFailure = replacedDocs.length;

		const result = apply({
			kind: "setTextStyle",
			id: "rect-1",
			match: "missing",
			fontWeight: "bold",
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("missing");
		expect(replacedDocs).toHaveLength(replacedCountBeforeFailure);
		expect(rootObject(currentDoc(), "rect-1").text).toBe("hello");
	});

	it("decorates not one stretch when a single setTextStyles entry matches nothing", () => {
		const { apply, replacedDocs, currentDoc } = createFakeDocBridge();
		apply({
			kind: "addObjects",
			objects: [
				{ type: "rect", x: 0, y: 0, text: "hello world" },
				{ type: "rect", x: 300, y: 0, text: "hello" },
			],
		});
		const replacedCountBeforeFailure = replacedDocs.length;

		const result = apply({
			kind: "setTextStyles",
			entries: [
				{ id: "rect-1", match: "world", fontStyle: "italic" },
				{ id: "rect-2", match: "world", fontStyle: "italic" },
			],
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("entries[1]");
		expect(replacedDocs).toHaveLength(replacedCountBeforeFailure);
		expect(rootObject(currentDoc(), "rect-1").text).toBe("hello world");
	});

	it("decorates several places in one body of text by listing the same id more than once", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({
			kind: "addObject",
			type: "rect",
			x: 0,
			y: 0,
			text: "ok and ng",
		});

		const result = apply({
			kind: "setTextStyles",
			entries: [
				{ id: "rect-1", match: "ok", fontColor: "#2e7d32" },
				{ id: "rect-1", match: "ng", fontColor: "#c62828" },
			],
		});

		expect(result.text).toBe(
			'styled 2 stretch(es) of text: every occurrence of "ok" in "rect-1", every occurrence of "ng" in "rect-1"',
		);
		expect(rootObject(currentDoc(), "rect-1").text).toEqual([
			{ text: "ok", fontColor: "#2e7d32" },
			{ text: " and " },
			{ text: "ng", fontColor: "#c62828" },
		]);
	});
});

describe("undo", () => {
	it("undoes the last step, and returns ok:false once the history has run out", () => {
		const { apply, currentDoc } = createFakeDocBridge();
		apply({ kind: "addObject", type: "rect", x: 0, y: 0 });
		apply({ kind: "addObject", type: "rect", x: 300, y: 0 });

		expect(apply({ kind: "undo" }).ok).toBe(true);
		expect(currentDoc().root.map((object) => object.id)).toEqual(["rect-1"]);

		expect(apply({ kind: "undo" }).ok).toBe(true);
		expect(currentDoc().root).toHaveLength(0);

		const exhausted = apply({ kind: "undo" });
		expect(exhausted.ok).toBe(false);
		expect(exhausted.text).toContain("nothing");
	});

	// The AI must not wipe out the user's edits; loosen this and hand work
	// disappears silently
	it("refuses to undo when the user edited after the AI applied something", () => {
		const { apply, bridge, currentDoc } = createFakeDocBridge();
		apply({ kind: "addObject", type: "rect", x: 0, y: 0 });

		const userEditedDoc = structuredClone(currentDoc());
		userEditedDoc.root = [];
		bridge.replaceDoc(userEditedDoc);

		const result = apply({ kind: "undo" });

		expect(result.ok).toBe(false);
		expect(currentDoc()).toBe(userEditedDoc);
	});
});
