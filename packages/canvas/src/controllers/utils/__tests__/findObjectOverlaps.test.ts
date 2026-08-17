import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../states/objects/connector/ConnectorState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { findObjectOverlaps } from "../findObjectOverlaps";

const rect = (
	id: string,
	cx: number,
	cy: number,
	width = 100,
	height = 100,
): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width,
		height,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

const toMap = (objects: ObjectState[]): Record<string, ObjectState> =>
	Object.fromEntries(objects.map((object) => [object.id, object]));

describe("findObjectOverlaps", () => {
	it("reports the shared area of two partly overlapping shapes", () => {
		const objects = toMap([rect("a", 0, 0), rect("b", 50, 0)]);
		expect(findObjectOverlaps(undefined, objects)).toEqual([
			{
				ids: ["a", "b"],
				overlap: { x: 0, y: -50, width: 50, height: 100 },
				covers: null,
			},
		]);
	});

	it("reports nothing for shapes that only touch along an edge", () => {
		const objects = toMap([rect("a", 0, 0), rect("b", 100, 0)]);
		expect(findObjectOverlaps(undefined, objects)).toEqual([]);
	});

	it("reports nothing for shapes that are apart", () => {
		const objects = toMap([rect("a", 0, 0), rect("b", 500, 500)]);
		expect(findObjectOverlaps(undefined, objects)).toEqual([]);
	});

	it("marks which of the two covers the other entirely", () => {
		const objects = toMap([rect("outer", 0, 0, 200, 200), rect("inner", 0, 0)]);
		const [overlap] = findObjectOverlaps(undefined, objects);
		expect(overlap.ids).toEqual(["outer", "inner"]);
		expect(overlap.covers).toBe("first");
	});

	it("marks a pair stacked in the same place as covering each other's box", () => {
		const objects = toMap([rect("a", 0, 0), rect("b", 0, 0)]);
		// Identical boxes: each covers the other, and the first found wins the label.
		expect(findObjectOverlaps(undefined, objects)[0].covers).toBe("first");
	});

	it("leaves connectors out, a line crossing a shape being how they are drawn", () => {
		const connector = {
			id: "c1",
			type: "connector",
			points: [],
			routing: "straight",
			source: { anchor: { kind: "free", point: { x: -50, y: 0 } } },
			target: { anchor: { kind: "free", point: { x: 50, y: 0 } } },
		} as unknown as ConnectorState;
		const objects = toMap([rect("a", 0, 0), connector]);
		expect(findObjectOverlaps(undefined, objects)).toEqual([]);
	});

	it("compares a group's members rather than the group's own union", () => {
		const objects = toMap([
			rect("a", 0, 0),
			rect("b", 50, 0),
			{
				id: "g1",
				type: "group",
				childIds: ["a", "b"],
			} as unknown as GroupState,
		]);
		const overlaps = findObjectOverlaps(undefined, objects);
		expect(overlaps).toHaveLength(1);
		expect(overlaps[0].ids).toEqual(["a", "b"]);
	});

	it("compares only the shapes asked for", () => {
		const objects = toMap([
			rect("a", 0, 0),
			rect("b", 50, 0),
			rect("c", 60, 0),
		]);
		expect(findObjectOverlaps(["a", "b"], objects)).toHaveLength(1);
		expect(findObjectOverlaps(undefined, objects)).toHaveLength(3);
	});

	it("orders the pairs by shared area, largest first", () => {
		const objects = toMap([
			rect("a", 0, 0),
			rect("small", 90, 0),
			rect("large", 10, 0),
		]);
		expect(
			findObjectOverlaps(["a", "small", "large"], objects).map(
				(overlap) => overlap.ids,
			)[0],
		).toEqual(["a", "large"]);
	});
});
