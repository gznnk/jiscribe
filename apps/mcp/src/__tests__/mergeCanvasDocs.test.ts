import type { CanvasDoc } from "@jiscribe/canvas";
import { describe, expect, it } from "vitest";

import {
	isSameJsonValue,
	mergeCanvasDocs,
	type CanvasMergeConflict,
} from "../viewer/mergeCanvasDocs";

type Json = Record<string, unknown>;

const rect = (id: string, x = 0, extra: Json = {}): Json => ({
	type: "rect",
	id,
	x,
	y: 0,
	width: 10,
	height: 10,
	...extra,
});

const group = (id: string, children: Json[], extra: Json = {}): Json => ({
	type: "group",
	id,
	children,
	...extra,
});

const connector = (id: string, fromId: string, toId: string): Json => ({
	type: "connector",
	id,
	source: { owner: { id: fromId }, anchor: { kind: "center" } },
	target: { owner: { id: toId }, anchor: { kind: "center" } },
});

const doc = (root: Json[], fields: Json = {}): CanvasDoc =>
	({ version: 1, ...fields, root }) as unknown as CanvasDoc;

/** The ids of a merged doc as a tree, `[id, [child ids…]]` for a group */
const shapeOf = (merged: CanvasDoc): unknown[] => {
	const walk = (members: unknown[]): unknown[] =>
		members.map((member) => {
			const { id, children } = member as { id: string; children?: unknown[] };
			return children === undefined ? id : [id, walk(children)];
		});
	return walk(merged.root);
};

const objectOf = (merged: CanvasDoc, id: string): Json | undefined => {
	const find = (members: unknown[]): Json | undefined => {
		for (const member of members as Json[]) {
			if (member.id === id) {
				return member;
			}
			if (Array.isArray(member.children)) {
				const found = find(member.children);
				if (found !== undefined) {
					return found;
				}
			}
		}
		return undefined;
	};
	return find(merged.root);
};

const merge = (base: CanvasDoc, mine: CanvasDoc, theirs: CanvasDoc) =>
	mergeCanvasDocs({ base, mine, theirs });

describe("isSameJsonValue", () => {
	it("ignores the order of object keys", () => {
		expect(
			isSameJsonValue({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 }),
		).toBe(true);
	});

	it("keeps the order of array items", () => {
		expect(isSameJsonValue([1, 2], [2, 1])).toBe(false);
	});

	it("counts a key holding undefined as absent", () => {
		expect(isSameJsonValue({ a: 1, b: undefined }, { a: 1 })).toBe(true);
	});

	it("tells an empty array from an empty object and from null", () => {
		expect(isSameJsonValue([], {})).toBe(false);
		expect(isSameJsonValue(null, {})).toBe(false);
	});
});

describe("mergeCanvasDocs", () => {
	it("returns theirs as it is when mine holds no edits", () => {
		const base = doc([rect("a"), rect("b")]);
		const theirs = doc([rect("a", 50), rect("b")]);
		const result = merge(base, doc([rect("a"), rect("b")]), theirs);
		expect(result.doc).toBe(theirs);
		expect(result.conflicts).toEqual([]);
	});

	it("counts mine as holding no edits when only its key order differs", () => {
		const base = doc([rect("a")]);
		const theirs = doc([rect("a", 50)]);
		const reordered = doc([
			{ id: "a", height: 10, width: 10, y: 0, x: 0, type: "rect" },
		]);
		expect(merge(base, reordered, theirs).doc).toBe(theirs);
	});

	it("returns mine as it is when theirs is base", () => {
		const base = doc([rect("a")]);
		const mine = doc([rect("a", 50)]);
		const result = merge(base, mine, doc([rect("a")]));
		expect(result.doc).toBe(mine);
		expect(result.conflicts).toEqual([]);
	});

	it("keeps an edit from each side to different objects", () => {
		const base = doc([rect("a"), rect("b")]);
		const result = merge(
			base,
			doc([rect("a", 50), rect("b")]),
			doc([rect("a"), rect("b", 70)]),
		);
		expect(result.doc.root).toEqual([rect("a", 50), rect("b", 70)]);
		expect(result.conflicts).toEqual([]);
	});

	it("takes an object both sides changed the same way once, without a conflict", () => {
		const base = doc([rect("a")]);
		const result = merge(
			base,
			doc([rect("a", 50)]),
			doc([rect("a", 50), rect("t")]),
		);
		expect(result.doc.root).toEqual([rect("a", 50), rect("t")]);
		expect(result.conflicts).toEqual([]);
	});

	it("lets theirs win an object both sides changed differently, and names it", () => {
		const base = doc([rect("a"), rect("b")]);
		const result = merge(
			base,
			doc([rect("a", 50), rect("b", 5)]),
			doc([rect("a", 70), rect("b")]),
		);
		expect(result.doc.root).toEqual([rect("a", 70), rect("b", 5)]);
		expect(result.conflicts).toEqual<CanvasMergeConflict[]>([
			{ kind: "object", id: "a", reason: "changed-on-both" },
		]);
	});

	it("treats changes to different fields of one object as a conflict", () => {
		const base = doc([rect("a")]);
		const result = merge(
			base,
			doc([rect("a", 50)]),
			doc([rect("a", 0, { fill: "#f00" })]),
		);
		expect(result.doc.root).toEqual([rect("a", 0, { fill: "#f00" })]);
		expect(result.conflicts).toEqual([
			{ kind: "object", id: "a", reason: "changed-on-both" },
		]);
	});

	it("keeps an object mine deleted when theirs changed it", () => {
		const base = doc([rect("a"), rect("b")]);
		const result = merge(
			base,
			doc([rect("b")]),
			doc([rect("a", 70), rect("b")]),
		);
		expect(result.doc.root).toEqual([rect("a", 70), rect("b")]);
		expect(result.conflicts).toEqual([
			{ kind: "object", id: "a", reason: "deleted-here" },
		]);
	});

	it("drops an object theirs deleted even when mine changed it", () => {
		const base = doc([rect("a"), rect("b")]);
		const result = merge(
			base,
			doc([rect("a", 50), rect("b")]),
			doc([rect("b")]),
		);
		expect(result.doc.root).toEqual([rect("b")]);
		expect(result.conflicts).toEqual([
			{ kind: "object", id: "a", reason: "deleted-there" },
		]);
	});

	it("deletes quietly what one side deleted and the other left alone", () => {
		const base = doc([rect("a"), rect("b"), rect("c")]);
		const result = merge(
			base,
			doc([rect("b"), rect("c")]),
			doc([rect("a"), rect("b")]),
		);
		expect(shapeOf(result.doc)).toEqual(["b"]);
		expect(result.conflicts).toEqual([]);
	});

	it("keeps objects both sides added under distinct ids, each next to its neighbours", () => {
		const base = doc([rect("a"), rect("b")]);
		const result = merge(
			base,
			doc([rect("a"), rect("m"), rect("b")]),
			doc([rect("a"), rect("b"), rect("t")]),
		);
		expect(shapeOf(result.doc)).toEqual(["a", "m", "b", "t"]);
		expect(result.conflicts).toEqual([]);
	});

	it("lets theirs win an id both sides added with different contents", () => {
		const base = doc([rect("a")]);
		const result = merge(
			base,
			doc([rect("a"), rect("n", 1)]),
			doc([rect("a"), rect("n", 2)]),
		);
		expect(result.doc.root).toEqual([rect("a"), rect("n", 2)]);
		expect(result.conflicts).toEqual([
			{ kind: "object", id: "n", reason: "changed-on-both" },
		]);
	});

	it("merges objects inside a group by id", () => {
		const base = doc([group("g", [rect("a"), rect("b")])]);
		const result = merge(
			base,
			doc([group("g", [rect("a", 50), rect("b")])]),
			doc([group("g", [rect("a"), rect("b", 70)])]),
		);
		expect(result.doc.root).toEqual([
			group("g", [rect("a", 50), rect("b", 70)]),
		]);
		expect(result.conflicts).toEqual([]);
	});

	it("keeps a move into a group made on one side alongside an edit on the other", () => {
		const base = doc([group("g", [rect("a"), rect("b")]), rect("c")]);
		const result = merge(
			base,
			doc([group("g", [rect("a"), rect("b"), rect("c")])]),
			doc([group("g", [rect("a"), rect("b")]), rect("c", 70)]),
		);
		expect(result.doc.root).toEqual([
			group("g", [rect("a"), rect("b"), rect("c", 70)]),
		]);
		expect(result.conflicts).toEqual([]);
	});

	it("keeps a group made on one side while the other edits one of its members", () => {
		const base = doc([rect("a"), rect("b"), rect("c")]);
		const result = merge(
			base,
			doc([group("g", [rect("a"), rect("b")]), rect("c")]),
			doc([rect("a", 70), rect("b"), rect("c")]),
		);
		expect(result.doc.root).toEqual([
			group("g", [rect("a", 70), rect("b")]),
			rect("c"),
		]);
		expect(result.conflicts).toEqual([]);
	});

	it("lets theirs win an object both sides moved into different groups", () => {
		const base = doc([
			group("g", [rect("x"), rect("y")]),
			group("h", [rect("z"), rect("w")]),
			rect("a"),
		]);
		const result = merge(
			base,
			doc([
				group("g", [rect("x"), rect("y"), rect("a")]),
				group("h", [rect("z"), rect("w")]),
			]),
			doc([
				group("g", [rect("x"), rect("y")]),
				group("h", [rect("z"), rect("w"), rect("a")]),
			]),
		);
		expect(shapeOf(result.doc)).toEqual([
			["g", ["x", "y"]],
			["h", ["z", "w", "a"]],
		]);
		expect(result.conflicts).toEqual([{ kind: "placement", id: "a" }]);
	});

	it("puts the members of a group dissolved on one side where the group was", () => {
		const base = doc([
			rect("a"),
			group("g", [rect("b"), rect("c")]),
			rect("d"),
		]);
		const result = merge(
			base,
			doc([rect("a"), rect("b"), rect("c"), rect("d")]),
			doc([rect("a"), group("g", [rect("b", 70), rect("c")]), rect("d")]),
		);
		expect(result.doc.root).toEqual([
			rect("a"),
			rect("b", 70),
			rect("c"),
			rect("d"),
		]);
		expect(result.conflicts).toEqual([]);
	});

	it("puts an object theirs changed back where its deleted group was", () => {
		const base = doc([
			rect("a"),
			group("g", [rect("b"), rect("c")]),
			rect("d"),
		]);
		const result = merge(
			base,
			doc([rect("a"), rect("d")]),
			doc([rect("a"), group("g", [rect("b", 70), rect("c")]), rect("d")]),
		);
		expect(result.doc.root).toEqual([rect("a"), rect("b", 70), rect("d")]);
		expect(result.conflicts).toEqual([
			{ kind: "object", id: "b", reason: "deleted-here" },
		]);
	});

	it("drops a group left without members", () => {
		const base = doc([group("g", [rect("a"), rect("b")])]);
		const result = merge(
			base,
			doc([group("g", [rect("b")]), rect("a")]),
			doc([group("g", [rect("a")]), rect("b")]),
		);
		// Each side moved one member out, onto the top of the root
		expect(shapeOf(result.doc)).toEqual(["b", "a"]);
	});

	it("breaks a loop of two groups each moved into the other, the file's way", () => {
		const base = doc([
			group("g", [rect("a"), rect("b")]),
			group("h", [rect("c"), rect("d")]),
		]);
		const result = merge(
			base,
			doc([
				group("h", [rect("c"), rect("d"), group("g", [rect("a"), rect("b")])]),
			]),
			doc([
				group("g", [rect("a"), rect("b"), group("h", [rect("c"), rect("d")])]),
			]),
		);
		expect(shapeOf(result.doc)).toEqual([["g", ["a", "b", ["h", ["c", "d"]]]]]);
		expect(result.conflicts).toEqual([{ kind: "placement", id: "g" }]);
	});

	it("keeps a reorder made on one side while the other adds", () => {
		const base = doc([rect("a"), rect("b"), rect("c")]);
		const result = merge(
			base,
			doc([rect("c"), rect("a"), rect("b")]),
			doc([rect("a"), rect("b"), rect("c"), rect("t")]),
		);
		expect(shapeOf(result.doc)).toEqual(["c", "a", "b", "t"]);
		expect(result.conflicts).toEqual([]);
	});

	it("keeps theirs' reorder while mine edits a member", () => {
		const base = doc([rect("a"), rect("b"), rect("c")]);
		const result = merge(
			base,
			doc([rect("a", 50), rect("b"), rect("c")]),
			doc([rect("c"), rect("a"), rect("b")]),
		);
		expect(result.doc.root).toEqual([rect("c"), rect("a", 50), rect("b")]);
		expect(result.conflicts).toEqual([]);
	});

	it("lets theirs win when both sides reordered the same members differently", () => {
		const base = doc([rect("a"), rect("b"), rect("c")]);
		const result = merge(
			base,
			doc([rect("c"), rect("a"), rect("b")]),
			doc([rect("b"), rect("a"), rect("c")]),
		);
		expect(shapeOf(result.doc)).toEqual(["b", "a", "c"]);
		expect(result.conflicts).toEqual([{ kind: "order", id: null }]);
	});

	it("keeps a connector added on one side to objects both sides kept", () => {
		const base = doc([rect("a"), rect("b")]);
		const result = merge(
			base,
			doc([rect("a"), rect("b"), connector("c1", "a", "b")]),
			doc([rect("a"), rect("b", 70)]),
		);
		expect(result.doc.root).toEqual([
			rect("a"),
			rect("b", 70),
			connector("c1", "a", "b"),
		]);
	});

	it("merges the document's own fields per key", () => {
		const base = doc([rect("a")], {
			background: "#fff",
			view: { open: "fit" },
		});
		const result = merge(
			base,
			doc([rect("a")], { background: "#000", view: { open: "fit" } }),
			doc([rect("a", 70)], { background: "#fff", view: { open: "fit-width" } }),
		);
		expect(result.doc).toEqual(
			doc([rect("a", 70)], { background: "#000", view: { open: "fit-width" } }),
		);
		expect(result.conflicts).toEqual([]);
	});

	it("lets theirs win a document field both sides set differently", () => {
		const base = doc([rect("a")], { background: "#fff" });
		const result = merge(
			base,
			doc([rect("a", 50)], { background: "#000" }),
			doc([rect("a")], { background: "#f00" }),
		);
		expect(result.doc).toEqual(doc([rect("a", 50)], { background: "#f00" }));
		expect(result.conflicts).toEqual([{ kind: "field", key: "background" }]);
	});

	it("keeps a document field removed on one side removed", () => {
		const base = doc([rect("a")], { background: "#fff" });
		const result = merge(
			base,
			doc([rect("a")]),
			doc([rect("a", 70)], { background: "#fff" }),
		);
		expect(result.doc).toEqual(doc([rect("a", 70)]));
		expect("background" in result.doc).toBe(false);
	});

	it("preserves fields it does not know, on objects and on the document", () => {
		const base = doc(
			[rect("a", 0, { futureField: { deep: [1] } }), rect("b")],
			{ futureDocField: 1 },
		);
		const result = merge(
			base,
			doc([rect("a", 50, { futureField: { deep: [1] } }), rect("b")], {
				futureDocField: 1,
			}),
			doc(
				[
					rect("a", 0, { futureField: { deep: [1] } }),
					rect("b", 0, { other: true }),
				],
				{
					futureDocField: 1,
				},
			),
		);
		expect(objectOf(result.doc, "a")).toEqual(
			rect("a", 50, { futureField: { deep: [1] } }),
		);
		expect(objectOf(result.doc, "b")).toEqual(rect("b", 0, { other: true }));
		expect(result.doc).toMatchObject({ futureDocField: 1 });
	});

	it("does not count mine's key order as a change when theirs changed the object", () => {
		const base = doc([rect("a"), rect("b")]);
		const result = merge(
			base,
			doc([
				{ id: "a", type: "rect", height: 10, width: 10, y: 0, x: 0 },
				rect("b", 5),
			]),
			doc([rect("a", 70), rect("b")]),
		);
		expect(result.doc.root).toEqual([rect("a", 70), rect("b", 5)]);
		expect(result.conflicts).toEqual([]);
	});
});
