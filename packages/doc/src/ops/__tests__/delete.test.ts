import { describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../model/canvas/CanvasDoc";
import { DocOperationError } from "../errors";
import {
	docOps,
	emptyDoc,
	expectValid,
	rootIds,
	twoConnectedRects,
} from "./support/docFixtures";

describe("deleteObjects", () => {
	it("removes the named objects and the connectors left dangling", () => {
		const doc = twoConnectedRects();

		const result = docOps.deleteObjects(doc, ["rect-2"]);

		expect(result.deletedIds).toEqual(["rect-2", "connector-1"]);
		expect(result.cascadedIds).toEqual(["connector-1"]);
		expect(rootIds(doc)).toEqual(["rect-1"]);
		expectValid(doc);
	});

	it("takes a group's children with it and drops the group when emptied", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0 });
		docOps.addObject(doc, "rect", { x: 200, y: 0 });
		const groupId = docOps.groupObjects(doc, ["rect-1", "rect-2"]);

		expect(docOps.deleteObjects(doc, [groupId]).deletedIds).toEqual([
			groupId,
			"rect-1",
			"rect-2",
		]);
		expect(doc.root).toHaveLength(0);
	});

	it("leaves the doc untouched when any id is missing", () => {
		const doc = twoConnectedRects();

		expect(() => docOps.deleteObjects(doc, ["rect-1", "missing"])).toThrow(
			DocOperationError,
		);
		expect(rootIds(doc)).toEqual(["rect-1", "rect-2", "connector-1"]);
	});
});

describe("groups emptied by a cascade", () => {
	/** A group holding another group, so emptying the inner one empties the outer. */
	const nestedGroups = (): CanvasDoc => {
		const doc = emptyDoc();
		for (const x of [0, 200, 400]) {
			docOps.addObject(doc, "rect", { x, y: 0, width: 100, height: 100 });
		}
		docOps.groupObjects(doc, ["rect-1", "rect-2"]);
		docOps.groupObjects(doc, ["group-1", "rect-3"]);
		return doc;
	};

	it("go in the same pass, innermost first", () => {
		const doc = nestedGroups();

		const { cascadedIds } = docOps.deleteObjects(doc, [
			"rect-1",
			"rect-2",
			"rect-3",
		]);

		expect(cascadedIds).toEqual(["group-1", "group-2"]);
		expect(doc.root).toEqual([]);
	});

	it("survive as long as one child is left", () => {
		const doc = nestedGroups();

		expect(docOps.deleteObjects(doc, ["rect-1"]).cascadedIds).toEqual([]);
		expect(rootIds(doc)).toEqual(["group-2"]);
		expectValid(doc);
	});
});
