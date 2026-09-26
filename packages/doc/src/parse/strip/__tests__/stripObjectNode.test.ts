import { describe, expect, it } from "vitest";

import { dropEmptiedGroup } from "../stripObjectNode";

describe("dropEmptiedGroup", () => {
	it("drops a group the walk emptied, reporting its id for the connector cascade", () => {
		const result = dropEmptiedGroup(
			{ id: "g1", type: "group", children: [] },
			"root[0]",
		);
		expect(result.node).toBeUndefined();
		expect(result.removedIds).toEqual(["g1"]);
		expect(result.warnings).toEqual([
			{
				path: "root[0]",
				message:
					"All children had unknown object types and no id: the group was dropped with them.",
				severity: "warning",
				id: "g1",
			},
		]);
	});

	it("drops an emptied group without an id, which has nothing to cascade", () => {
		const result = dropEmptiedGroup({ type: "group", children: [] }, "root[0]");
		expect(result.node).toBeUndefined();
		expect(result.removedIds).toEqual([]);
		expect(result.warnings[0].id).toBeUndefined();
	});

	it("passes through every node that is not an emptied group", () => {
		const node = { id: "g1", type: "group", children: [{ id: "r1" }] };
		const result = dropEmptiedGroup(node, "root[0]");
		expect(result.node).toBe(node);
		expect(result.warnings).toEqual([]);
	});
});
