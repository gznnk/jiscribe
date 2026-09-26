import { describe, expect, it } from "vitest";

import { collectRemovedIds } from "../collectRemovedIds";

describe("collectRemovedIds", () => {
	it("collects the node's own id and every descendant's, in document order", () => {
		expect(
			collectRemovedIds({
				id: "a",
				children: [
					{ id: "b", children: [{ id: "c" }] },
					{ id: "d" },
					"not-an-object",
					{ type: "rect" },
				],
			}),
		).toEqual(["a", "b", "c", "d"]);
	});

	it("descends into children of an unknown type, whose structure is not ours to trust", () => {
		expect(
			collectRemovedIds({ id: "a", type: "hexagram", children: [{ id: "b" }] }),
		).toEqual(["a", "b"]);
	});

	it.each([
		["a node without an id", { children: [{ id: "b" }] }, ["b"]],
		["a node whose children is not an array", { id: "a", children: {} }, ["a"]],
		["a non-object", "nope", []],
	])("handles %s", (_label, node, expected) => {
		expect(collectRemovedIds(node)).toEqual(expected);
	});
});
