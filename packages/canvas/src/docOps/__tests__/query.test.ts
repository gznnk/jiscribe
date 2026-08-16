import { describe, expect, it } from "vitest";

import {
	docOps,
	emptyDoc,
	readObject,
	twoConnectedRects,
	twoRects,
} from "./support/docFixtures";
import { cardDefinition } from "./support/pluginFixtures";
import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import type { ObjectDoc } from "../../schemas/objects/base/ObjectDoc";
import { createDocOps } from "../createDocOps";
import { DocOperationError } from "../errors";
import type { ObjectFilter } from "../ops/query";

const slotOps = createDocOps({
	plugins: [{ id: "slot-plugin", objects: { "slot-card": cardDefinition } }],
});

describe("getObject", () => {
	it("returns the document's own object, not a copy of it", () => {
		const doc = twoRects();

		expect(docOps.getObject(doc, "rect-1")).toBe(readObject(doc, "rect-1"));
	});

	it("reads an object out of a group", () => {
		const doc = twoRects();
		docOps.groupObjects(doc, ["rect-1", "rect-2"]);

		expect(docOps.getObject(doc, "rect-2").id).toBe("rect-2");
	});

	it("throws DocOperationError for an id the doc does not hold", () => {
		expect(() => docOps.getObject(twoRects(), "nope")).toThrow(
			DocOperationError,
		);
	});
});

describe("listObjects", () => {
	it("summarizes every object in drawing order", () => {
		const doc = twoRects();
		docOps.setText(doc, "rect-1", "Start");

		expect(docOps.listObjects(doc)).toEqual([
			{
				id: "rect-1",
				type: "rect",
				bounds: { x: 0, y: 0, width: 100, height: 100 },
				parentId: null,
				text: "Start",
			},
			{
				id: "rect-2",
				type: "rect",
				bounds: { x: 300, y: 0, width: 100, height: 100 },
				parentId: null,
				text: "",
			},
		]);
	});

	it("lists a group's children flat, right after the group itself", () => {
		const doc = twoRects();
		const groupId = docOps.groupObjects(doc, ["rect-1", "rect-2"]);

		expect(
			docOps.listObjects(doc).map(({ id, parentId }) => ({
				id,
				parentId,
			})),
		).toEqual([
			{ id: groupId, parentId: null },
			{ id: "rect-1", parentId: groupId },
			{ id: "rect-2", parentId: groupId },
		]);
	});

	it("reports a group's own box and no text at all", () => {
		const doc = twoRects();
		const groupId = docOps.groupObjects(doc, ["rect-1", "rect-2"]);

		expect(docOps.listObjects(doc)[0]).toEqual({
			id: groupId,
			type: "group",
			bounds: { x: 0, y: 0, width: 400, height: 100 },
			parentId: null,
			text: null,
		});
	});

	it("reports a connector's label, and that it has no box", () => {
		const doc = twoConnectedRects();
		docOps.setText(doc, "connector-1", "on failure");

		expect(docOps.listObjects(doc)[2]).toMatchObject({
			id: "connector-1",
			bounds: null,
			text: "on failure",
		});
	});

	it("joins every slot of a keyed type", () => {
		const doc: CanvasDoc = {
			version: 1,
			root: [
				{
					id: "card-1",
					type: "slot-card",
					x: 0,
					y: 0,
					width: 180,
					height: 90,
					text: {
						name: { text: "User" },
						attributes: { text: ["id", "email"] },
					},
				} as unknown as ObjectDoc,
			],
		};

		expect(slotOps.listObjects(doc)[0].text).toBe("User\nid\nemail");
	});

	it("drops the styling of a body styled in parts", () => {
		const doc = twoRects();
		readObject(doc, "rect-1").text = [
			{ text: "Payment " },
			{ text: "failed", fontWeight: "bold" },
		];

		expect(docOps.listObjects(doc)[0].text).toBe("Payment failed");
	});

	it("is empty for an empty doc", () => {
		expect(docOps.listObjects(emptyDoc())).toEqual([]);
	});
});

describe("findObjects", () => {
	/** Two rects and the connector joining them, the rects labelled. */
	const labelledDoc = (): CanvasDoc => {
		const doc = twoConnectedRects();
		docOps.setText(doc, "rect-1", "Start");
		docOps.setText(doc, "rect-2", "Restart");
		return doc;
	};

	const foundIds = (doc: CanvasDoc, filter: ObjectFilter) =>
		docOps.findObjects(doc, filter).map(({ id }) => id);

	it("keeps everything when no condition is given", () => {
		const doc = labelledDoc();

		expect(docOps.findObjects(doc, {})).toEqual(docOps.listObjects(doc));
	});

	it("keeps one type, or any of several", () => {
		const doc = labelledDoc();

		expect(foundIds(doc, { type: "connector" })).toEqual(["connector-1"]);
		expect(foundIds(doc, { type: ["rect", "connector"] })).toEqual([
			"rect-1",
			"rect-2",
			"connector-1",
		]);
	});

	it("matches text case-insensitively, anywhere in it", () => {
		const doc = labelledDoc();

		expect(foundIds(doc, { text: "start" })).toEqual(["rect-1", "rect-2"]);
		expect(foundIds(doc, { text: "Re" })).toEqual(["rect-2"]);
	});

	it("keeps only what sits entirely inside the rect", () => {
		const doc = labelledDoc();

		// rect-1 is inside, rect-2 straddles the right edge, and the connector has no box.
		expect(
			foundIds(doc, { within: { x: -10, y: -10, width: 360, height: 120 } }),
		).toEqual(["rect-1"]);
		// The edges themselves count as inside.
		expect(
			foundIds(doc, { within: { x: 0, y: 0, width: 400, height: 100 } }),
		).toEqual(["rect-1", "rect-2"]);
	});

	it("keeps a group's direct children, leaving its grandchildren to it", () => {
		const doc = twoRects();
		docOps.addObject(doc, "rect", { x: 600, y: 0, width: 100, height: 100 });
		const innerId = docOps.groupObjects(doc, ["rect-1", "rect-2"]);
		const outerId = docOps.groupObjects(doc, [innerId, "rect-3"]);

		expect(foundIds(doc, { inGroup: outerId })).toEqual([innerId, "rect-3"]);
		expect(foundIds(doc, { inGroup: innerId })).toEqual(["rect-1", "rect-2"]);
	});

	it("narrows on every condition given at once", () => {
		const doc = labelledDoc();

		expect(
			foundIds(doc, {
				type: "rect",
				text: "start",
				within: { x: 0, y: 0, width: 100, height: 100 },
			}),
		).toEqual(["rect-1"]);
	});

	it("is empty when nothing matches", () => {
		expect(foundIds(labelledDoc(), { text: "missing" })).toEqual([]);
	});

	it("throws DocOperationError when inGroup names an id the doc does not hold", () => {
		expect(() =>
			docOps.findObjects(labelledDoc(), { inGroup: "nope" }),
		).toThrow(DocOperationError);
	});

	it("throws DocOperationError when inGroup names an id that is not a group", () => {
		const doc = labelledDoc();

		expect(() => docOps.findObjects(doc, { inGroup: "rect-1" })).toThrow(
			DocOperationError,
		);
	});
});
