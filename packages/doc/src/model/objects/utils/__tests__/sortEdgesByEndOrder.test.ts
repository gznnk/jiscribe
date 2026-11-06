import { describe, expect, it } from "vitest";

import { restackBeneath } from "../restackBeneath";
import { sortEdgesByEndOrder } from "../sortEdgesByEndOrder";

const edge = (id: string, sourceId: string, targetId: string) => ({
	id,
	sourceId,
	targetId,
});

describe("sortEdgesByEndOrder", () => {
	it("orders by the source's place, then the target's, then the connector's own", () => {
		const edges = [
			edge("c1", "b", "c"),
			edge("c2", "a", "c"),
			edge("c3", "a", "b"),
			edge("c4", "a", "b"),
		];

		expect(
			sortEdgesByEndOrder(edges, ["a", "b", "c", "c4", "c3", "c1", "c2"]).map(
				({ id }) => id,
			),
		).toEqual(["c4", "c3", "c2", "c1"]);
	});

	it("reads the same order once restacking has moved the connectors", () => {
		const edges = [
			edge("c1", "e", "f"),
			edge("c2", "a", "b"),
			edge("c3", "b", "c"),
			edge("c4", "a", "b"),
		];
		const before = ["a", "b", "c", "e", "f", "c1", "c2", "c3", "c4"];
		const { orderedIds: after } = restackBeneath(before, [
			{ id: "c1", beneathPaths: [["e"]] },
			{ id: "c2", beneathPaths: [["a"]] },
			{ id: "c3", beneathPaths: [["b"]] },
			{ id: "c4", beneathPaths: [["a"]] },
		]);
		expect(after).not.toEqual(before);

		expect(sortEdgesByEndOrder(edges, after)).toEqual(
			sortEdgesByEndOrder(edges, before),
		);
	});

	it("counts a repeated id where it first stands", () => {
		const edges = [edge("c1", "b", "a"), edge("c2", "a", "b")];

		expect(
			sortEdgesByEndOrder(edges, ["a", "b", "c1", "c2", "b"]).map(
				({ id }) => id,
			),
		).toEqual(["c2", "c1"]);
	});

	it("refuses an edge or an owner the tree order leaves out", () => {
		expect(() =>
			sortEdgesByEndOrder([edge("c1", "a", "ghost")], ["a", "c1"]),
		).toThrow("ghost is not in the tree order");
	});
});
