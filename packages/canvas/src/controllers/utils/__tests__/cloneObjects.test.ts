import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { cloneObjects } from "../cloneObjects";

const ZERO = { x: 0, y: 0 };

// To focus the tests on the remap logic, build ObjectState with minimal shapes.
const objects = (map: Record<string, unknown>): Record<string, ObjectState> =>
	map as Record<string, ObjectState>;

describe("cloneObjects", () => {
	it("consistently remaps a group's childIds and its children's parentId to the new IDs", () => {
		const { newObjects, newTopLevelIds, idRemap } = cloneObjects(
			["G"],
			objects({
				G: { id: "G", type: "group", cx: 0, cy: 0, childIds: ["C"] },
				C: { id: "C", type: "rect", parentId: "G" },
			}),
			ZERO,
		);

		const newG = idRemap.get("G")!;
		const newC = idRemap.get("C")!;

		expect(newTopLevelIds).toEqual([newG]);
		expect(
			(newObjects[newG] as unknown as { childIds: string[] }).childIds,
		).toEqual([newC]);
		expect(newObjects[newC].parentId).toBe(newG);
	});

	it("a child whose parent is not in the clone set has its parentId dropped and is promoted to top level (prevents orphaning)", () => {
		// C's parent EXTERNAL is not in allObjects, and C itself is not in topLevelIds.
		const { newObjects, newTopLevelIds, idRemap } = cloneObjects(
			[],
			objects({
				C: { id: "C", type: "rect", parentId: "EXTERNAL" },
			}),
			ZERO,
		);

		const newC = idRemap.get("C")!;

		expect(newObjects[newC].parentId).toBeUndefined();
		// not orphaned; reachable as a top-level object
		expect(newTopLevelIds).toEqual([newC]);
	});

	it("excludes childIds that reference children not in the clone set (leaves no dangling references)", () => {
		const { newObjects, idRemap } = cloneObjects(
			["G"],
			objects({
				G: { id: "G", type: "group", cx: 0, cy: 0, childIds: ["C", "MISSING"] },
				C: { id: "C", type: "rect", parentId: "G" },
			}),
			ZERO,
		);

		const newG = idRemap.get("G")!;
		const newC = idRemap.get("C")!;

		expect(
			(newObjects[newG] as unknown as { childIds: string[] }).childIds,
		).toEqual([newC]);
	});

	it("returns connectors as members of topLevelIds in input order and remaps their endpoint owner IDs", () => {
		const { newObjects, newTopLevelIds, idRemap } = cloneObjects(
			["A", "CONN"],
			objects({
				A: { id: "A", type: "rect" },
				CONN: {
					id: "CONN",
					type: "connector",
					parentId: "EXTERNAL",
					source: { owner: { id: "A" } },
					target: { owner: { id: "EXTERNAL" } },
				},
			}),
			ZERO,
		);

		const newA = idRemap.get("A")!;
		const newConn = idRemap.get("CONN")!;

		// returned preserving input order (object -> connector); from topLevelIds, not promotion.
		expect(newTopLevelIds).toEqual([newA, newConn]);
		expect(newObjects[newConn].parentId).toBeUndefined();
		const conn = newObjects[newConn] as unknown as {
			source: { owner: { id: string } };
			target: { owner: { id: string } };
		};
		// owners inside the set get new IDs; owners outside the set keep their original IDs
		expect(conn.source.owner.id).toBe(newA);
		expect(conn.target.owner.id).toBe("EXTERNAL");
	});

	it("does not double-register when a topLevelIds root and a promoted root overlap", () => {
		// equivalent to an internal copy: the selected child C is in topLevelIds, but parent G is outside the set.
		const { newTopLevelIds, idRemap } = cloneObjects(
			["C"],
			objects({
				C: { id: "C", type: "rect", parentId: "G" },
			}),
			ZERO,
		);

		const newC = idRemap.get("C")!;
		expect(newTopLevelIds).toEqual([newC]);
	});
});
