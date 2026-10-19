import { defineObjectAiTool, type AiToolPlugin } from "@jiscribe/ai-tools-sdk";
import {
	builtinObjectDocDefinitions,
	createDocOps,
	type CanvasDoc,
	type ObjectDoc,
} from "@jiscribe/doc";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import type { AiCanvasOpOutcome } from "../../canvasOps";
import type { CanvasToolArgs } from "../../canvasTools";
import { createCanvasToolSet } from "../../canvasToolSet";
import { applyCanvasOp } from "../applyCanvasOp";
import { createCanvasOpHistory } from "../canvasOpHistory";
import type { AiDocBridge } from "../docBridge";

/**
 * The built-ins, with the rect declaring the connect points the remap tools below move
 * ends between, the way a plugin type declares its own.
 */
const docOps = createDocOps({
	presetDefinitions: {
		...builtinObjectDocDefinitions,
		rect: {
			...builtinObjectDocDefinitions.rect,
			extraConnectPointIds: () => ["col:1:right", "col:2:right", "col:3:right"],
		},
	},
});

/** A rect as the tools below read it; the built-in rect stands in for a plugin's own type */
type RectLike = ObjectDoc & { width: number };

/** Stand-in plugin tools acting on the built-in rect, one per path through the applier */
const rectToolPlugin: AiToolPlugin = {
	id: "rect-tools",
	tools: [
		defineObjectAiTool({
			name: "rect_set_width",
			description: "Set the width of a rect.",
			objectType: "rect",
			inputSchema: { width: z.number() },
			apply: (objectDoc: RectLike, { width }) => ({
				doc: { ...objectDoc, width },
				text: `"${objectDoc.id}" is now ${width} wide`,
			}),
		}),
		defineObjectAiTool({
			name: "rect_break_width",
			description: "Write a width the rect type refuses.",
			objectType: "rect",
			inputSchema: {},
			apply: (objectDoc) => ({
				doc: { ...objectDoc, width: "wide" },
				text: "broke it",
			}),
		}),
		defineObjectAiTool({
			name: "rect_add_unknown_field",
			description: "Write a field the rect type does not hold.",
			objectType: "rect",
			inputSchema: {},
			apply: (objectDoc) => ({
				doc: { ...objectDoc, bogus: 1 },
				text: "added it",
			}),
		}),
		defineObjectAiTool({
			name: "rect_scribble_input",
			description: "Write into the object it was handed, then refuse.",
			objectType: "rect",
			inputSchema: {},
			apply: (objectDoc: RectLike) => {
				objectDoc.width = 999;
				throw new Error("the rect has no room for that");
			},
		}),
		defineObjectAiTool({
			name: "rect_shift_points",
			description:
				"Swap two connect points and move a third onto the right edge.",
			objectType: "rect",
			inputSchema: {},
			apply: (objectDoc) => ({
				doc: { ...objectDoc },
				text: "shifted",
				connectPointRemap: {
					"col:1:right": { kind: "connectPoint", id: "col:2:right" },
					"col:2:right": { kind: "connectPoint", id: "col:1:right" },
					"col:3:right": { kind: "edge", side: "right", t: 0.62 },
				},
			}),
		}),
		defineObjectAiTool({
			name: "rect_remap_nothing_attached",
			description: "Remap a connect point no connector names.",
			objectType: "rect",
			inputSchema: {},
			apply: (objectDoc) => ({
				doc: { ...objectDoc },
				text: "remapped",
				connectPointRemap: {
					"col:9:right": { kind: "center" },
				},
			}),
		}),
		defineObjectAiTool({
			name: "rect_remap_invalid",
			description: "Remap onto an anchor an owned end cannot hold.",
			objectType: "rect",
			inputSchema: {},
			apply: (objectDoc: RectLike) => ({
				doc: { ...objectDoc, width: 300 },
				text: "remapped",
				connectPointRemap: {
					"col:1:right": { kind: "free", point: { x: 0, y: 0 } } as never,
				},
			}),
		}),
		defineObjectAiTool({
			name: "rect_read_width",
			description: "Read the width of a rect.",
			objectType: "rect",
			inputSchema: {},
			read: (objectDoc: RectLike) =>
				`"${objectDoc.id}" is ${objectDoc.width} wide`,
		}),
	],
};

const toolSet = createCanvasToolSet(
	{ creatableObjectTypes: ["rect", "ellipse"], connectableObjectTypes: [] },
	[rectToolPlugin],
);

/** A document holding one rect and one ellipse, with a bridge that records every replacement */
const setUp = () => {
	let doc: CanvasDoc = { version: 1, root: [] };
	const rectId = docOps.addObject(doc, "rect", {
		x: 0,
		y: 0,
		width: 100,
		height: 50,
	});
	const ellipseId = docOps.addObject(doc, "ellipse", { x: 200, y: 0 });
	const replacedDocs: CanvasDoc[] = [];
	const bridge: AiDocBridge = {
		getDoc: () => doc,
		replaceDoc: (nextDoc) => {
			replacedDocs.push(nextDoc);
			doc = nextDoc;
		},
	};
	const history = createCanvasOpHistory();
	/** Calls a tool the way a host does: its declaration builds the op from the arguments */
	const callTool = (name: string, args: CanvasToolArgs): AiCanvasOpOutcome => {
		const descriptor = toolSet.descriptors.find(
			(candidate) => candidate.name === name,
		);
		if (descriptor === undefined) {
			throw new Error(`tool ${name} is not declared`);
		}
		const op = descriptor.toOp(args);
		if (op.kind !== "objectTool") {
			throw new Error(`tool ${name} did not build an objectTool op`);
		}
		return applyCanvasOp(op, bridge, history, docOps, toolSet);
	};
	const readRect = (): RectLike =>
		docOps.getObject(doc, rectId) as Readonly<RectLike>;
	return {
		rectId,
		ellipseId,
		replacedDocs,
		history,
		callTool,
		readRect,
		currentDoc: () => doc,
		undo: () =>
			applyCanvasOp({ kind: "undo" }, bridge, history, docOps, toolSet),
	};
};

describe("applyCanvasOp with a plugin's object tool", () => {
	it("writes what the tool built back, and reports the tool's own sentence", () => {
		const { rectId, callTool, readRect, replacedDocs, history } = setUp();

		const outcome = callTool("rect_set_width", { id: rectId, width: 240 });

		expect(outcome).toEqual({ ok: true, text: `"${rectId}" is now 240 wide` });
		expect(readRect().width).toBe(240);
		expect(replacedDocs).toHaveLength(1);
		expect(history.depth()).toBe(1);
	});

	it("takes the write back on undo", () => {
		const { rectId, callTool, readRect, undo } = setUp();

		callTool("rect_set_width", { id: rectId, width: 240 });

		expect(undo().ok).toBe(true);
		expect(readRect().width).toBe(100);
	});

	it("refuses an object of another type, without calling the tool", () => {
		const { ellipseId, callTool, replacedDocs } = setUp();

		const outcome = callTool("rect_set_width", { id: ellipseId, width: 240 });

		expect(outcome).toEqual({
			ok: false,
			text: `rect_set_width acts on rect objects only, but "${ellipseId}" is of type ellipse`,
		});
		expect(replacedDocs).toEqual([]);
	});

	it("refuses an id the document does not hold", () => {
		const { callTool } = setUp();

		expect(callTool("rect_set_width", { id: "missing", width: 1 })).toEqual({
			ok: false,
			text: "object not found: missing",
		});
	});

	it("refuses a result the type's validateDoc rejects, leaving the document as it was", () => {
		const { rectId, callTool, currentDoc, replacedDocs, history } = setUp();
		const before = structuredClone(currentDoc());

		const outcome = callTool("rect_break_width", { id: rectId });

		expect(outcome.ok).toBe(false);
		expect(outcome.text).toContain(`cannot replace "${rectId}"`);
		expect(outcome.text).toContain("width");
		expect(currentDoc()).toEqual(before);
		expect(replacedDocs).toEqual([]);
		expect(history.depth()).toBe(0);
	});

	it("refuses a result carrying a field the type does not hold, which a save would drop", () => {
		const { rectId, callTool, replacedDocs } = setUp();

		const outcome = callTool("rect_add_unknown_field", { id: rectId });

		expect(outcome.ok).toBe(false);
		expect(outcome.text).toContain('Unknown property "bogus"');
		expect(replacedDocs).toEqual([]);
	});

	it("hands back what the tool throws as it is, and its scribbles never reach the document", () => {
		const { rectId, callTool, readRect, replacedDocs } = setUp();

		const outcome = callTool("rect_scribble_input", { id: rectId });

		expect(outcome).toEqual({
			ok: false,
			text: "the rect has no room for that",
		});
		expect(readRect().width).toBe(100);
		expect(replacedDocs).toEqual([]);
	});

	it("answers a read without replacing the document or leaving an undo step", () => {
		const { rectId, callTool, replacedDocs, history } = setUp();

		const outcome = callTool("rect_read_width", { id: rectId });

		expect(outcome).toEqual({ ok: true, text: `"${rectId}" is 100 wide` });
		expect(replacedDocs).toEqual([]);
		expect(history.depth()).toBe(0);
	});

	it("fails as an internal error for a tool the set applying it does not hold", () => {
		const { rectId, currentDoc } = setUp();
		const bridge: AiDocBridge = {
			getDoc: currentDoc,
			replaceDoc: () => {
				throw new Error("must not be reached");
			},
		};

		const outcome = applyCanvasOp(
			{ kind: "objectTool", tool: "rect_set_width", id: rectId, args: {} },
			bridge,
			createCanvasOpHistory(),
			docOps,
			createCanvasToolSet(null, []),
		);

		expect(outcome.ok).toBe(false);
		expect(outcome.text).toMatch(/^internal error: /);
	});

	describe("with a connectPointRemap", () => {
		/** {@link setUp} plus three connectors leaving the rect from the ids it declares here */
		const setUpWired = () => {
			const harness = setUp();
			const doc = harness.currentDoc();
			for (const sourcePoint of ["col:1:right", "col:2:right", "col:3:right"]) {
				docOps.connect(doc, {
					sourceId: harness.rectId,
					targetId: harness.ellipseId,
					sourceAnchor: sourcePoint,
					targetAnchor: "leftCenter",
				});
			}
			return harness;
		};
		const sourceAnchors = (doc: CanvasDoc): unknown[] =>
			doc.root
				.filter((object) => object.type === "connector")
				.map((object) => (object as Record<string, unknown>).source)
				.map((source) => (source as { anchor: unknown }).anchor);

		it("moves the connector ends and reports each one after the tool's sentence", () => {
			const { rectId, callTool, currentDoc, history } = setUpWired();

			const outcome = callTool("rect_shift_points", { id: rectId });

			expect(outcome).toEqual({
				ok: true,
				text: 'shifted; moved 3 connector ends: "connector-1" source → col:2:right, "connector-2" source → col:1:right, "connector-3" source → right edge (t=0.62)',
			});
			expect(sourceAnchors(currentDoc())).toEqual([
				{ kind: "connectPoint", id: "col:2:right" },
				{ kind: "connectPoint", id: "col:1:right" },
				{ kind: "edge", side: "right", t: 0.62 },
			]);
			expect(history.depth()).toBe(1);
		});

		it("takes the object and its connectors back in one undo step", () => {
			const { rectId, callTool, currentDoc, undo } = setUpWired();
			const before = structuredClone(currentDoc());

			callTool("rect_shift_points", { id: rectId });

			expect(undo().ok).toBe(true);
			expect(currentDoc()).toEqual(before);
		});

		it("appends nothing when no end moved", () => {
			const { rectId, callTool } = setUpWired();

			expect(callTool("rect_remap_nothing_attached", { id: rectId })).toEqual({
				ok: true,
				text: "remapped",
			});
		});

		it("fails on an anchor an owned end cannot hold, writing neither the object nor its connectors", () => {
			const { rectId, callTool, currentDoc, replacedDocs, history } =
				setUpWired();
			const before = structuredClone(currentDoc());

			const outcome = callTool("rect_remap_invalid", { id: rectId });

			expect(outcome.ok).toBe(false);
			expect(outcome.text).toContain('connect point remap "col:1:right"');
			expect(currentDoc()).toEqual(before);
			expect(replacedDocs).toEqual([]);
			expect(history.depth()).toBe(0);
		});
	});
});
