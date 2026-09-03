import { describe, expect, it } from "vitest";

import {
	docOps,
	emptyDoc,
	expectValid,
	readObject,
	rootIds,
	twoConnectedRects,
} from "./support/docFixtures";
import type { CanvasDoc } from "../../model/canvas/CanvasDoc";
import type { ObjectDoc } from "../../model/objects/base/ObjectDoc";
import { DocOperationError } from "../errors";

describe("groupObjects / dissolveGroup", () => {
	it("wraps siblings in a group at the earliest member's place", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0 });
		docOps.addObject(doc, "rect", { x: 200, y: 0 });
		docOps.addObject(doc, "rect", { x: 400, y: 0 });

		const groupId = docOps.groupObjects(doc, ["rect-3", "rect-1"]);

		expect(groupId).toBe("group-1");
		expect(rootIds(doc)).toEqual(["group-1", "rect-2"]);
		expect(
			(readObject(doc, "group-1").children as ObjectDoc[]).map(
				(child) => child.id,
			),
		).toEqual(["rect-1", "rect-3"]);
		expectValid(doc);
	});

	it("keeps a connector to a grouped object working", () => {
		const doc = twoConnectedRects();

		docOps.groupObjects(doc, ["rect-1", "rect-2"]);

		expect(rootIds(doc)).toEqual(["group-1", "connector-1"]);
		expectValid(doc);
	});

	it("puts the children back where the group was", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0 });
		docOps.addObject(doc, "rect", { x: 200, y: 0 });
		docOps.addObject(doc, "rect", { x: 400, y: 0 });
		const groupId = docOps.groupObjects(doc, ["rect-1", "rect-2"]);

		expect(docOps.dissolveGroup(doc, groupId)).toEqual(["rect-1", "rect-2"]);
		expect(rootIds(doc)).toEqual(["rect-1", "rect-2", "rect-3"]);
		expectValid(doc);
	});

	it("refuses to group a connector", () => {
		const doc = twoConnectedRects();

		expect(() => docOps.groupObjects(doc, ["rect-1", "connector-1"])).toThrow(
			/connector/,
		);
	});
});

describe("dissolveGroups", () => {
	/** root: [group-2[rect-1, group-1[rect-2, rect-3]], rect-4] */
	const nestedGroups = (): CanvasDoc => {
		const doc = emptyDoc();
		for (const x of [0, 200, 400, 600]) {
			docOps.addObject(doc, "rect", { x, y: 0, width: 100, height: 100 });
		}
		const innerId = docOps.groupObjects(doc, ["rect-2", "rect-3"]);
		docOps.groupObjects(doc, ["rect-1", innerId]);
		return doc;
	};

	it("dissolves every group and returns what stands on its own, group by group", () => {
		const doc = emptyDoc();
		for (const x of [0, 200, 400, 600]) {
			docOps.addObject(doc, "rect", { x, y: 0, width: 100, height: 100 });
		}
		docOps.groupObjects(doc, ["rect-1", "rect-2"]);
		docOps.groupObjects(doc, ["rect-3", "rect-4"]);

		expect(docOps.dissolveGroups(doc, ["group-2", "group-1"])).toEqual([
			"rect-3",
			"rect-4",
			"rect-1",
			"rect-2",
		]);
		expect(rootIds(doc)).toEqual(["rect-1", "rect-2", "rect-3", "rect-4"]);
		expectValid(doc);
	});

	// A group named in the same call is taken apart on its own turn, so it never shows up
	// as released; either order ends with both levels gone and the drawing order kept.
	it("takes a parent and its nested group apart in whichever order they are given", () => {
		const parentFirst = nestedGroups();
		expect(docOps.dissolveGroups(parentFirst, ["group-2", "group-1"])).toEqual([
			"rect-1",
			"rect-2",
			"rect-3",
		]);
		expect(rootIds(parentFirst)).toEqual([
			"rect-1",
			"rect-2",
			"rect-3",
			"rect-4",
		]);

		const childFirst = nestedGroups();
		expect(docOps.dissolveGroups(childFirst, ["group-1", "group-2"])).toEqual([
			"rect-2",
			"rect-3",
			"rect-1",
		]);
		expect(rootIds(childFirst)).toEqual([
			"rect-1",
			"rect-2",
			"rect-3",
			"rect-4",
		]);
	});

	it("counts a repeated id once, the second turn having nothing left to dissolve", () => {
		const doc = nestedGroups();

		expect(docOps.dissolveGroups(doc, ["group-2", "group-2"])).toEqual([
			"rect-1",
			"group-1",
		]);
		expect(rootIds(doc)).toEqual(["rect-1", "group-1", "rect-4"]);
	});

	it("dissolves nothing when one id is not a group", () => {
		const doc = nestedGroups();
		const before = JSON.stringify(doc);

		expect(() => docOps.dissolveGroups(doc, ["group-2", "rect-4"])).toThrow(
			'ids[1] (rect-4): rect-4 is "rect", not a group — the document was left unchanged',
		);
		expect(JSON.stringify(doc)).toBe(before);
	});

	// The check runs over the deduplicated ids, so the index has to be looked up in the
	// caller's array, which a repeat makes wider than the set.
	it("reports the failing id at its place in the caller's own array", () => {
		const doc = nestedGroups();

		expect(() =>
			docOps.dissolveGroups(doc, ["group-2", "group-2", "rect-4"]),
		).toThrow('ids[2] (rect-4): rect-4 is "rect", not a group');
	});

	it("is a no-op returning no ids for an empty array", () => {
		const doc = nestedGroups();
		const before = JSON.stringify(doc);

		expect(docOps.dissolveGroups(doc, [])).toEqual([]);
		expect(JSON.stringify(doc)).toBe(before);
	});

	it("matches dissolveGroup for a single id", () => {
		const singleDoc = nestedGroups();
		const singleReleasedIds = docOps.dissolveGroup(singleDoc, "group-2");

		const batchDoc = nestedGroups();
		const batchReleasedIds = docOps.dissolveGroups(batchDoc, ["group-2"]);

		expect(batchReleasedIds).toEqual(singleReleasedIds);
		expect(JSON.stringify(batchDoc)).toBe(JSON.stringify(singleDoc));
	});
});

describe("addObjectsToGroup / removeObjectsFromGroup", () => {
	/** A group of two rects, with two more rects left outside it. */
	const groupedPair = (): CanvasDoc => {
		const doc = emptyDoc();
		for (const x of [0, 200, 400, 600]) {
			docOps.addObject(doc, "rect", { x, y: 0, width: 100, height: 100 });
		}
		docOps.groupObjects(doc, ["rect-1", "rect-2"]);
		return doc;
	};

	const childIds = (doc: CanvasDoc, groupId: string): string[] =>
		(readObject(doc, groupId).children as ObjectDoc[]).map((child) => child.id);

	it("appends the newcomers to the group in the order given", () => {
		const doc = groupedPair();

		expect(
			docOps.addObjectsToGroup(doc, "group-1", ["rect-4", "rect-3"]),
		).toEqual([]);
		expect(rootIds(doc)).toEqual(["group-1"]);
		expect(childIds(doc, "group-1")).toEqual([
			"rect-1",
			"rect-2",
			"rect-4",
			"rect-3",
		]);
		expectValid(doc);
	});

	it("drops a group the move left empty", () => {
		const doc = groupedPair();
		docOps.groupObjects(doc, ["rect-3", "rect-4"]);

		expect(
			docOps.addObjectsToGroup(doc, "group-1", ["rect-3", "rect-4"]),
		).toEqual(["group-2"]);
		expect(rootIds(doc)).toEqual(["group-1"]);
		expect(childIds(doc, "group-1")).toEqual([
			"rect-1",
			"rect-2",
			"rect-3",
			"rect-4",
		]);
		expectValid(doc);
	});

	it("refuses a connector, a move into itself, and an unknown id — without moving anything", () => {
		const doc = twoConnectedRects();
		docOps.addObject(doc, "rect", { x: 600, y: 0 });
		docOps.groupObjects(doc, ["rect-1", "rect-2"]);

		expect(() =>
			docOps.addObjectsToGroup(doc, "group-1", ["connector-1"]),
		).toThrow(/connector/);
		expect(() => docOps.addObjectsToGroup(doc, "group-1", ["group-1"])).toThrow(
			/inside itself/,
		);
		expect(() => docOps.addObjectsToGroup(doc, "group-1", ["rect-9"])).toThrow(
			DocOperationError,
		);
		expect(() => docOps.addObjectsToGroup(doc, "rect-3", ["rect-3"])).toThrow(
			/not a group/,
		);
		expect(childIds(doc, "group-1")).toEqual(["rect-1", "rect-2"]);
	});

	it("puts a member back right after its group, keeping the given order", () => {
		const doc = groupedPair();
		docOps.addObjectsToGroup(doc, "group-1", ["rect-3"]);

		expect(docOps.removeObjectsFromGroup(doc, ["rect-1", "rect-3"])).toEqual({
			releasedIds: ["rect-1", "rect-3"],
			droppedGroupIds: [],
		});
		expect(rootIds(doc)).toEqual(["group-1", "rect-1", "rect-3", "rect-4"]);
		expect(childIds(doc, "group-1")).toEqual(["rect-2"]);
		expectValid(doc);
	});

	it("taking every member out is the same as ungrouping", () => {
		const doc = groupedPair();

		expect(
			docOps.removeObjectsFromGroup(doc, ["rect-1", "rect-2"]).droppedGroupIds,
		).toEqual(["group-1"]);
		expect(rootIds(doc)).toEqual(["rect-1", "rect-2", "rect-3", "rect-4"]);
		expectValid(doc);
	});

	it("refuses an object that is not in a group", () => {
		const doc = groupedPair();

		expect(() => docOps.removeObjectsFromGroup(doc, ["rect-3"])).toThrow(
			/not inside a group/,
		);
		expect(rootIds(doc)).toEqual(["group-1", "rect-3", "rect-4"]);
	});
});

describe("a rotated group", () => {
	/** Two rects in a group turned by `rotation`, with a third rect left outside. */
	const rotatedGroup = (rotation: number): CanvasDoc => {
		const doc = emptyDoc();
		for (const x of [0, 200, 400]) {
			docOps.addObject(doc, "rect", { x, y: 0, width: 100, height: 100 });
		}
		docOps.groupObjects(doc, ["rect-1", "rect-2"]);
		readObject(doc, "group-1").rotation = rotation;
		return doc;
	};

	const groupChildIds = (doc: CanvasDoc): string[] =>
		(readObject(doc, "group-1").children as ObjectDoc[]).map(
			(child) => child.id,
		);

	it("cannot be dissolved, because its rotation has nowhere to go", () => {
		const doc = rotatedGroup(30);

		expect(() => docOps.dissolveGroup(doc, "group-1")).toThrow(/rotated by 30/);
		expect(rootIds(doc)).toEqual(["group-1", "rect-3"]);
	});

	it("takes no new member, and lets none of its own go", () => {
		const doc = rotatedGroup(30);

		expect(() => docOps.addObjectsToGroup(doc, "group-1", ["rect-3"])).toThrow(
			/rotated/,
		);
		expect(() => docOps.removeObjectsFromGroup(doc, ["rect-1"])).toThrow(
			/rotated/,
		);
		expect(groupChildIds(doc)).toEqual(["rect-1", "rect-2"]);
		expect(rootIds(doc)).toEqual(["group-1", "rect-3"]);
	});

	it("is only refused once actually turned, not for a written-out 0", () => {
		const doc = rotatedGroup(0);

		expect(docOps.addObjectsToGroup(doc, "group-1", ["rect-3"])).toEqual([]);
		expect(groupChildIds(doc)).toEqual(["rect-1", "rect-2", "rect-3"]);
		expectValid(doc);
	});
});

describe("an id given more than once", () => {
	const groupedPair = (): CanvasDoc => {
		const doc = emptyDoc();
		for (const x of [0, 200, 400, 600]) {
			docOps.addObject(doc, "rect", { x, y: 0, width: 100, height: 100 });
		}
		docOps.groupObjects(doc, ["rect-1", "rect-2"]);
		return doc;
	};

	const childIds = (doc: CanvasDoc, groupId: string): string[] =>
		(readObject(doc, groupId).children as ObjectDoc[]).map((child) => child.id);

	it("is not two objects, so it cannot make a group on its own", () => {
		const doc = groupedPair();

		expect(() => docOps.groupObjects(doc, ["rect-3", "rect-3"])).toThrow(
			/at least 2 objects, got 1/,
		);
		expect(rootIds(doc)).toEqual(["group-1", "rect-3", "rect-4"]);
	});

	it("moves into a group once, leaving the object beside it alone", () => {
		const doc = groupedPair();

		docOps.addObjectsToGroup(doc, "group-1", ["rect-3", "rect-3"]);

		expect(childIds(doc, "group-1")).toEqual(["rect-1", "rect-2", "rect-3"]);
		expect(rootIds(doc)).toEqual(["group-1", "rect-4"]);
		expectValid(doc);
	});

	it("leaves a group once, and is reported once", () => {
		const doc = groupedPair();

		expect(docOps.removeObjectsFromGroup(doc, ["rect-1", "rect-1"])).toEqual({
			releasedIds: ["rect-1"],
			droppedGroupIds: [],
		});
		expect(rootIds(doc)).toEqual(["group-1", "rect-1", "rect-3", "rect-4"]);
		expect(childIds(doc, "group-1")).toEqual(["rect-2"]);
		expectValid(doc);
	});

	it("is deleted once when both a group and its child are named", () => {
		const doc = groupedPair();

		expect(docOps.deleteObjects(doc, ["group-1", "rect-1"])).toEqual({
			deletedIds: ["group-1", "rect-1", "rect-2"],
			cascadedIds: [],
		});
		expect(rootIds(doc)).toEqual(["rect-3", "rect-4"]);
		expectValid(doc);
	});
});

describe("objects measured from their children", () => {
	it("bring the whole group along when aligned by the box it occupies", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 40, width: 100, height: 100 });
		docOps.addObject(doc, "rect", { x: 200, y: 40, width: 100, height: 100 });
		docOps.addObject(doc, "rect", { x: 400, y: 0, width: 100, height: 100 });
		docOps.groupObjects(doc, ["rect-1", "rect-2"]);

		docOps.alignObjects(doc, ["group-1", "rect-3"], "top");

		expect(readObject(doc, "rect-1")).toMatchObject({ x: 0, y: 0 });
		expect(readObject(doc, "rect-2")).toMatchObject({ x: 200, y: 0 });
		expect(readObject(doc, "rect-3")).toMatchObject({ x: 400, y: 0 });
		expectValid(doc);
	});

	it("have no box at all while empty, so they cannot be placed", () => {
		const doc = emptyDoc();
		doc.root.push({
			id: "group-1",
			type: "group",
			children: [],
		} as unknown as ObjectDoc);

		expect(() => docOps.setPosition(doc, "group-1", { x: 10 })).toThrow(
			/has no position that can be changed/,
		);
	});

	it("are refused outright when this instance does not know the type", () => {
		const doc = emptyDoc();
		doc.root.push({
			id: "gadget-1",
			type: "gadget",
			x: 0,
			y: 0,
		} as unknown as ObjectDoc);

		expect(() => docOps.setPosition(doc, "gadget-1", { x: 10 })).toThrow(
			/"gadget"\) has no position that can be changed/,
		);
	});
});

describe("getParentGroup / getGroupMembers", () => {
	/** `group-1` holding `rect-1` and a nested `group-2`, beside a loose `rect-4`. */
	const nestedGroups = (): CanvasDoc => {
		const doc = emptyDoc();
		for (let index = 0; index < 4; index += 1) {
			docOps.addObject(doc, "rect", { x: index * 200, y: 0 });
		}
		docOps.groupObjects(doc, ["rect-2", "rect-3"]);
		docOps.groupObjects(doc, ["rect-1", "group-1"]);
		return doc;
	};

	it("names the group directly holding the object", () => {
		const doc = nestedGroups();

		expect(docOps.getParentGroup(doc, "rect-2")).toBe("group-1");
		expect(docOps.getParentGroup(doc, "group-1")).toBe("group-2");
	});

	it("is null for an object sitting at the root", () => {
		const doc = nestedGroups();

		expect(docOps.getParentGroup(doc, "group-2")).toBeNull();
		expect(docOps.getParentGroup(doc, "rect-4")).toBeNull();
	});

	it("lists the direct children in drawing order, grandchildren left out", () => {
		const doc = nestedGroups();

		expect(docOps.getGroupMembers(doc, "group-2")).toEqual([
			"rect-1",
			"group-1",
		]);
		expect(docOps.getGroupMembers(doc, "group-1")).toEqual([
			"rect-2",
			"rect-3",
		]);
	});

	it("reads a group that is rotated, which only editing its membership refuses", () => {
		const doc = nestedGroups();
		docOps.setRotation(doc, ["group-1"], 30);

		expect(docOps.getGroupMembers(doc, "group-1")).toEqual([
			"rect-2",
			"rect-3",
		]);
		expect(() => docOps.addObjectsToGroup(doc, "group-1", ["rect-4"])).toThrow(
			DocOperationError,
		);
	});

	it("refuses an id that is not a group", () => {
		const doc = nestedGroups();

		expect(() => docOps.getGroupMembers(doc, "rect-4")).toThrow(
			'rect-4 is "rect", not a group',
		);
	});

	it("throws for an id that is not in the doc", () => {
		const doc = nestedGroups();

		expect(() => docOps.getParentGroup(doc, "missing")).toThrow(
			"object not found: missing",
		);
		expect(() => docOps.getGroupMembers(doc, "missing")).toThrow(
			DocOperationError,
		);
	});
});
