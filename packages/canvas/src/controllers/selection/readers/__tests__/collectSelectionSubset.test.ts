import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { collectSelectionSubset } from "../collectSelectionSubset";

const rect = (id: string, parentId?: string): ObjectState =>
	({ id, type: "rect", parentId }) as unknown as ObjectState;

const group = (id: string, childIds: string[]): ObjectState =>
	({ id, type: "group", childIds }) as unknown as ObjectState;

const connector = (
	id: string,
	sourceOwnerId: string,
	targetOwnerId: string,
): ObjectState =>
	({
		id,
		type: "connector",
		points: [],
		source: { owner: { id: sourceOwnerId }, anchor: { kind: "center" } },
		target: { owner: { id: targetOwnerId }, anchor: { kind: "center" } },
	}) as unknown as ObjectState;

/**
 * Root, back to front: g (holding a, b), c, c-ab (a → b), c-ac (a → c), d.
 */
const objects: Record<string, ObjectState> = {
	g: group("g", ["a", "b"]),
	a: rect("a", "g"),
	b: rect("b", "g"),
	c: rect("c"),
	d: rect("d"),
	"c-ab": connector("c-ab", "a", "b"),
	"c-ac": connector("c-ac", "a", "c"),
};
const rootIds = ["g", "c", "c-ab", "c-ac", "d"];

describe("collectSelectionSubset", () => {
	it("takes a group with its children and the connectors running between them", () => {
		const subset = collectSelectionSubset(["g"], objects, rootIds);
		expect([...subset.objectIds].sort()).toEqual(["a", "b", "c-ab", "g"]);
		expect(subset.rootIds).toEqual(["g", "c-ab"]);
	});

	it("leaves out a connector with an end outside the selection", () => {
		const subset = collectSelectionSubset(["g"], objects, rootIds);
		expect(subset.objectIds.has("c-ac")).toBe(false);
	});

	it("takes a child of a group alone, without the group or its siblings", () => {
		const subset = collectSelectionSubset(["a"], objects, rootIds);
		expect([...subset.objectIds]).toEqual(["a"]);
		expect(subset.rootIds).toEqual(["a"]);
	});

	it("orders the root ids by canvas z-order, whatever order they were selected in", () => {
		const subset = collectSelectionSubset(["d", "c", "a"], objects, rootIds);
		expect(subset.rootIds).toEqual(["a", "c", "c-ac", "d"]);
	});

	it("lists a named connector and a repeated id once", () => {
		const subset = collectSelectionSubset(
			["c", "g", "c-ac", "c"],
			objects,
			rootIds,
		);
		expect(subset.rootIds).toEqual(["g", "c", "c-ab", "c-ac"]);
	});
});
