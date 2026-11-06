import { describe, expect, it } from "vitest";

import { restackBeneath } from "../restackBeneath";

describe("restackBeneath", () => {
	it("moves an object to just beneath the sibling it has to be beneath", () => {
		expect(
			restackBeneath(
				["a", "b", "c", "line"],
				[{ id: "line", beneathPaths: [["b"]] }],
			),
		).toEqual({ orderedIds: ["a", "line", "b", "c"], movedIds: ["line"] });
	});

	it("goes beneath the lower of two siblings", () => {
		expect(
			restackBeneath(
				["a", "b", "c", "line"],
				[{ id: "line", beneathPaths: [["c"], ["b"]] }],
			).orderedIds,
		).toEqual(["a", "line", "b", "c"]);
	});

	it("stands a shape in a group for by the group among the siblings", () => {
		expect(
			restackBeneath(
				["a", "group", "line"],
				[{ id: "line", beneathPaths: [["shape", "inner", "group"]] }],
			).orderedIds,
		).toEqual(["a", "line", "group"]);
	});

	it("leaves an object already lower than what it has to be beneath", () => {
		expect(
			restackBeneath(
				["line", "a", "b"],
				[{ id: "line", beneathPaths: [["b"]] }],
			),
		).toEqual({ orderedIds: ["line", "a", "b"], movedIds: [] });
	});

	it("moves nothing for a request naming no sibling, or an object not among them", () => {
		expect(
			restackBeneath(
				["a", "line"],
				[
					{ id: "line", beneathPaths: [["elsewhere", "other-group"]] },
					{ id: "missing", beneathPaths: [["a"]] },
				],
			),
		).toEqual({ orderedIds: ["a", "line"], movedIds: [] });
	});

	it("keeps several brought beneath one sibling in the order they had", () => {
		expect(
			restackBeneath(
				["a", "first", "b", "second"],
				[
					{ id: "second", beneathPaths: [["a"]] },
					{ id: "first", beneathPaths: [["a"]] },
				],
			),
		).toEqual({
			orderedIds: ["first", "second", "a", "b"],
			movedIds: ["first", "second"],
		});
	});

	it("brings along what goes beneath an object that moves itself", () => {
		expect(
			restackBeneath(
				["a", "b", "c"],
				[
					{ id: "c", beneathPaths: [["b"]] },
					{ id: "b", beneathPaths: [["a"]] },
				],
			).orderedIds,
		).toEqual(["c", "b", "a"]);
	});
});
