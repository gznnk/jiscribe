import { createDocOps, type CanvasDoc } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import type { AiDocOp } from "../../canvasOps";
import { createCanvasToolSet } from "../../canvasToolSet";
import { applyCanvasOp } from "../applyCanvasOp";
import { createCanvasOpHistory } from "../canvasOpHistory";
import type { AiDocBridge } from "../docBridge";

const docOps = createDocOps();

const builtinToolSet = createCanvasToolSet(null, []);

/** Applies ops one after another on a document of its own */
const createApplier = (initialDoc: CanvasDoc = { version: 1, root: [] }) => {
	let doc = initialDoc;
	const bridge: AiDocBridge = {
		getDoc: () => doc,
		replaceDoc: (nextDoc) => {
			doc = nextDoc;
		},
	};
	const history = createCanvasOpHistory();
	return (op: AiDocOp) =>
		applyCanvasOp(op, bridge, history, docOps, builtinToolSet);
};

/** An applier whose document already holds rect-1 and rect-2 */
const twoRects = () => {
	const apply = createApplier();
	apply({
		kind: "addObjects",
		objects: [
			{ type: "rect", x: 0, y: 0 },
			{ type: "rect", x: 300, y: 0 },
		],
	});
	return apply;
};

describe("createdIds", () => {
	it("holds the one id addObject created", () => {
		const apply = createApplier();

		const result = apply({ kind: "addObject", type: "rect", x: 10, y: 20 });

		expect(result.createdIds).toEqual(["rect-1"]);
		expect(result.text).toBe('added rect "rect-1" at (10, 20)');
	});

	it("lists what addObjects added in the order the objects were given", () => {
		const apply = createApplier();

		const result = apply({
			kind: "addObjects",
			objects: [
				{ type: "ellipse", x: 0, y: 0 },
				{ type: "rect", x: 200, y: 0 },
			],
		});

		expect(result.createdIds).toEqual(["ellipse-1", "rect-1"]);
		expect(result.text).toBe(
			'added 2 objects: ellipse "ellipse-1", rect "rect-1"',
		);
	});

	it("puts the group groupNewObjects made after the objects it wraps", () => {
		const apply = createApplier();

		const result = apply({
			kind: "addObjects",
			groupNewObjects: true,
			objects: [
				{ type: "rect", x: 0, y: 0 },
				{ type: "rect", x: 200, y: 0 },
			],
		});

		expect(result.createdIds).toEqual(["rect-1", "rect-2", "group-1"]);
		expect(result.text).toBe(
			'added 2 objects as group "group-1": rect "rect-1", rect "rect-2"',
		);
	});

	// The group was there before, so it is not reported as created
	it("leaves the existing group out when addObjects adds into parentGroupId", () => {
		const apply = createApplier();
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

		expect(result.createdIds).toEqual(["rect-3"]);
		expect(result.text).toBe('added 1 objects inside "group-1": rect "rect-3"');
	});

	it("holds the connector connect drew", () => {
		const apply = twoRects();

		const result = apply({
			kind: "connect",
			sourceId: "rect-1",
			targetId: "rect-2",
		});

		expect(result.createdIds).toEqual(["connector-1"]);
		expect(result.text).toBe('connected "rect-1" → "rect-2" as "connector-1"');
	});

	it("lists the connectors connectMany drew in entry order", () => {
		const apply = twoRects();

		const result = apply({
			kind: "connectMany",
			entries: [
				{ sourceId: "rect-2", targetId: "rect-1" },
				{ sourceId: "rect-1", targetPoint: { x: 900, y: 50 } },
			],
		});

		expect(result.createdIds).toEqual(["connector-1", "connector-2"]);
	});

	it("holds the group groupObjects made", () => {
		const apply = twoRects();

		const result = apply({ kind: "groupObjects", ids: ["rect-1", "rect-2"] });

		expect(result.createdIds).toEqual(["group-1"]);
		expect(result.text).toBe('grouped "rect-1", "rect-2" as "group-1"');
	});

	it("is absent from a read", () => {
		const apply = twoRects();

		const result = apply({ kind: "listObjects" });

		expect(result.ok).toBe(true);
		expect(result).not.toHaveProperty("createdIds");
	});

	it("is absent from an edit that creates nothing", () => {
		const apply = twoRects();

		const result = apply({ kind: "setPosition", id: "rect-1", x: 50 });

		expect(result.ok).toBe(true);
		expect(result).not.toHaveProperty("createdIds");
	});

	it("is absent from a creating op that failed", () => {
		const apply = twoRects();

		const result = apply({
			kind: "connect",
			sourceId: "rect-1",
			targetId: "rect-9",
		});

		expect(result.ok).toBe(false);
		expect(result).not.toHaveProperty("createdIds");
	});

	// Bringing back what was deleted is not creating it
	it("is absent from an undo that brings deleted objects back", () => {
		const apply = twoRects();
		apply({ kind: "deleteObjects", ids: ["rect-1"] });

		const result = apply({ kind: "undo" });

		expect(result.ok).toBe(true);
		expect(result).not.toHaveProperty("createdIds");
	});
});
