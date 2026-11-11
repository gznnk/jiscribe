import { describe, expect, it } from "vitest";

import { splitLayoutGraph } from "../splitLayoutGraph";

const edge = (sourceId: string, targetId: string) => ({
	id: `${sourceId}-${targetId}`,
	sourceId,
	targetId,
});

describe("splitLayoutGraph", () => {
	it("splits by edges, keeping input order and the extra fields", () => {
		const parts = splitLayoutGraph({
			nodes: [
				{ id: "a", width: 1 },
				{ id: "x", width: 2 },
				{ id: "b", width: 3 },
				{ id: "y", width: 4 },
			],
			containers: [],
			edges: [edge("x", "y"), edge("b", "a")],
		});
		expect(parts).toEqual([
			{
				nodes: [
					{ id: "a", width: 1 },
					{ id: "b", width: 3 },
				],
				containers: [],
				edges: [edge("b", "a")],
			},
			{
				nodes: [
					{ id: "x", width: 2 },
					{ id: "y", width: 4 },
				],
				containers: [],
				edges: [edge("x", "y")],
			},
		]);
	});

	it("joins the nodes of one container, through nested ones", () => {
		const parts = splitLayoutGraph({
			nodes: [
				{ id: "a", parentId: "inner" },
				{ id: "b", parentId: "outer" },
				{ id: "c" },
			],
			containers: [
				{ id: "outer", isShape: true },
				{ id: "inner", parentId: "outer", isShape: false },
			],
			edges: [],
		});
		expect(parts).toEqual([
			{
				nodes: [
					{ id: "a", parentId: "inner" },
					{ id: "b", parentId: "outer" },
				],
				containers: [
					{ id: "outer", isShape: true },
					{ id: "inner", parentId: "outer", isShape: false },
				],
				edges: [],
			},
			{ nodes: [{ id: "c" }], containers: [], edges: [] },
		]);
	});

	it("joins two containers through an edge between their members", () => {
		const parts = splitLayoutGraph({
			nodes: [
				{ id: "a", parentId: "left" },
				{ id: "b", parentId: "right" },
			],
			containers: [{ id: "left" }, { id: "right" }],
			edges: [edge("a", "b")],
		});
		expect(parts).toHaveLength(1);
		expect(parts[0]?.containers.map(({ id }) => id)).toEqual(["left", "right"]);
	});

	it("leaves out an edge to an unknown id and a container holding no node", () => {
		const parts = splitLayoutGraph({
			nodes: [{ id: "a" }],
			containers: [{ id: "empty" }],
			edges: [edge("a", "ghost")],
		});
		expect(parts).toEqual([
			{ nodes: [{ id: "a" }], containers: [], edges: [] },
		]);
	});

	it("returns no part for an empty graph", () => {
		expect(splitLayoutGraph({ nodes: [], containers: [], edges: [] })).toEqual(
			[],
		);
	});
});
