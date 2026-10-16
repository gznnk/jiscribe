import { describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../model/canvas/CanvasDoc";
import type { ObjectDoc } from "../../model/objects/base/ObjectDoc";
import { DocOperationError } from "../errors";
import {
	docOps,
	emptyDoc,
	expectValid,
	readObject,
} from "./support/docFixtures";

type LooseObjectDoc = ObjectDoc & Record<string, unknown>;

/** The object as a doc to build a replacement from; readObject types it as a bare record */
const readDoc = (doc: CanvasDoc, id: string): LooseObjectDoc =>
	readObject(doc, id) as LooseObjectDoc;

/** A document holding one rect and a group of two, ready to be replaced into. */
const withRect = () => {
	const doc = emptyDoc();
	const rectId = docOps.addObject(doc, "rect", {
		x: 0,
		y: 0,
		width: 100,
		height: 50,
	});
	const memberIds = docOps.addObjects(doc, [
		{ type: "rect", x: 200, y: 0 },
		{ type: "rect", x: 400, y: 0 },
	]);
	const groupId = docOps.groupObjects(doc, memberIds);
	return { doc, rectId, memberIds, groupId };
};

describe("replaceObject", () => {
	it("swaps the object for the new doc, keeping its place", () => {
		const { doc, rectId } = withRect();
		const replacement = { ...readDoc(doc, rectId), width: 240 };

		docOps.replaceObject(doc, rectId, replacement);

		expect(readObject(doc, rectId).width).toBe(240);
		expect(doc.root[0]?.id).toBe(rectId);
		expectValid(doc);
	});

	it("reaches an object inside a group", () => {
		const { doc, memberIds } = withRect();
		const memberId = memberIds[0] as string;

		const replacement = { ...readDoc(doc, memberId), width: 30 };

		docOps.replaceObject(doc, memberId, replacement);

		expect(readObject(doc, memberId).width).toBe(30);
	});

	it("writes a copy, so the caller's object is not the document's", () => {
		const { doc, rectId } = withRect();
		const replacement = { ...readDoc(doc, rectId), width: 240 };

		docOps.replaceObject(doc, rectId, replacement);
		replacement.width = 1;

		expect(readObject(doc, rectId).width).toBe(240);
	});

	it.each([
		[
			"a changed id",
			(object: LooseObjectDoc) => ({ ...object, id: "other" }),
			'whose id is "other"',
		],
		[
			"a changed type",
			(object: LooseObjectDoc) => ({ ...object, type: "ellipse" }),
			'of type "ellipse"',
		],
		[
			"a value the type rejects",
			(object: LooseObjectDoc) => ({ ...object, width: "wide" }),
			".width",
		],
		[
			"a name the type does not hold",
			(object: LooseObjectDoc) => ({ ...object, bogus: 1 }),
			'Unknown property "bogus"',
		],
		[
			"a malformed meta",
			(object: LooseObjectDoc) => ({ ...object, meta: "note" }),
			".meta",
		],
	])("refuses %s, leaving the document as it was", (_label, rework, phrase) => {
		const { doc, rectId } = withRect();
		const before = structuredClone(doc);
		const replacement = rework({ ...readDoc(doc, rectId) }) as LooseObjectDoc;

		expect(() => docOps.replaceObject(doc, rectId, replacement)).toThrow(
			DocOperationError,
		);
		expect(() => docOps.replaceObject(doc, rectId, replacement)).toThrow(
			phrase,
		);
		expect(doc).toEqual(before);
	});

	it("refuses a group, whose children carry ids of their own", () => {
		const { doc, groupId } = withRect();

		expect(() =>
			docOps.replaceObject(doc, groupId, readDoc(doc, groupId)),
		).toThrow("cannot replace group");
	});

	it("refuses an id the document does not hold", () => {
		const { doc } = withRect();

		expect(() =>
			docOps.replaceObject(doc, "missing", { id: "missing", type: "rect" }),
		).toThrow("object not found: missing");
	});
});
