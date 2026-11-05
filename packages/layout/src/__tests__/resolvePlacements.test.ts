import { describe, expect, it } from "vitest";

import {
	type PlacementCandidate,
	resolvePlacements,
} from "../resolvePlacements";

const box = (
	id: string,
	x: number,
	y: number,
	width = 40,
	height = 30,
): PlacementCandidate => ({
	id,
	bounds: { x, y, width, height },
	kind: "node",
});

const containerShape = (
	id: string,
	x: number,
	y: number,
	width: number,
	height: number,
	titleHeight?: number,
): PlacementCandidate => ({
	id,
	bounds: { x, y, width, height },
	kind: "containerShape",
	...(titleHeight !== undefined ? { titleHeight } : {}),
});

describe("resolvePlacements", () => {
	it("makes a container shape the parent of the candidates inside it, edges included", () => {
		const { nodes, containers } = resolvePlacements([
			containerShape("vpc", 0, 0, 200, 100, 24),
			box("a", 0, 0),
			box("b", 160, 70),
			box("out", 300, 0),
		]);
		expect(nodes).toEqual([
			{
				id: "a",
				bounds: { x: 0, y: 0, width: 40, height: 30 },
				parentId: "vpc",
			},
			{
				id: "b",
				bounds: { x: 160, y: 70, width: 40, height: 30 },
				parentId: "vpc",
			},
			{ id: "out", bounds: { x: 300, y: 0, width: 40, height: 30 } },
		]);
		expect(containers).toEqual([
			{
				id: "vpc",
				bounds: { x: 0, y: 0, width: 200, height: 100 },
				isShape: true,
				titleHeight: 24,
			},
		]);
	});

	it.each([undefined, 0, -5, Number.NaN, Number.POSITIVE_INFINITY])(
		"reads a title band of %s as none",
		(titleHeight) => {
			const { containers } = resolvePlacements([
				containerShape("vpc", 0, 0, 200, 100, titleHeight),
				box("a", 10, 10),
			]);
			expect(containers[0]?.titleHeight).toBe(0);
		},
	);

	it("gives a box inside nested container shapes to the smallest one", () => {
		const { nodes, containers } = resolvePlacements([
			containerShape("outer", 0, 0, 400, 300),
			containerShape("inner", 10, 10, 200, 150),
			box("a", 20, 20),
		]);
		expect(nodes).toEqual([
			expect.objectContaining({ id: "a", parentId: "inner" }),
		]);
		expect(containers.map(({ id, parentId }) => ({ id, parentId }))).toEqual([
			{ id: "outer", parentId: undefined },
			{ id: "inner", parentId: "outer" },
		]);
	});

	it("places container shapes holding no node as nodes, without a parent", () => {
		// "empty" sits in "outer", but neither holds a node, so both are boxes of their own.
		const { nodes, containers } = resolvePlacements([
			containerShape("outer", 0, 0, 400, 300),
			containerShape("empty", 10, 10, 50, 50),
			box("far", 500, 0),
		]);
		expect(nodes).toEqual([
			{ id: "far", bounds: { x: 500, y: 0, width: 40, height: 30 } },
			{ id: "outer", bounds: { x: 0, y: 0, width: 400, height: 300 } },
			{ id: "empty", bounds: { x: 10, y: 10, width: 50, height: 50 } },
		]);
		expect(containers).toEqual([]);
	});

	it("drops an empty container shape's parent when that holds nothing else", () => {
		const { nodes, containers } = resolvePlacements([
			containerShape("lonely", 0, 0, 50, 50),
			box("far", 500, 0),
		]);
		expect(nodes).toEqual([
			{ id: "far", bounds: { x: 500, y: 0, width: 40, height: 30 } },
			{ id: "lonely", bounds: { x: 0, y: 0, width: 50, height: 50 } },
		]);
		expect(containers).toEqual([]);
	});

	it("makes a group the parent of its children and drops an empty group", () => {
		const { nodes, containers } = resolvePlacements([
			{
				id: "g",
				bounds: { x: 0, y: 0, width: 100, height: 30 },
				kind: "group",
				titleHeight: 99,
				children: [box("a", 0, 0), box("b", 60, 0)],
			},
			{
				id: "emptyGroup",
				bounds: { x: 0, y: 0, width: 0, height: 0 },
				kind: "group",
				children: [],
			},
		]);
		expect(nodes.map(({ id, parentId }) => [id, parentId])).toEqual([
			["a", "g"],
			["b", "g"],
		]);
		expect(containers).toEqual([
			{
				id: "g",
				bounds: { x: 0, y: 0, width: 100, height: 30 },
				isShape: false,
				titleHeight: 0,
			},
		]);
	});

	it("adopts into a container shape only at its own group level", () => {
		const { nodes } = resolvePlacements([
			containerShape("vpc", 0, 0, 400, 300),
			{
				id: "g",
				bounds: { x: 10, y: 10, width: 100, height: 30 },
				kind: "group",
				children: [box("a", 10, 10), box("b", 70, 10)],
			},
			box("loose", 200, 200),
		]);
		expect(nodes.map(({ id, parentId }) => [id, parentId])).toEqual([
			["a", "g"],
			["b", "g"],
			["loose", "vpc"],
		]);
	});

	it("counts a candidate reached twice the first time only", () => {
		const child = box("a", 0, 0);
		const { nodes } = resolvePlacements([
			child,
			{
				id: "g",
				bounds: { x: 0, y: 0, width: 100, height: 30 },
				kind: "group",
				children: [child, box("b", 60, 0)],
			},
		]);
		expect(nodes.map(({ id, parentId }) => [id, parentId])).toEqual([
			["a", undefined],
			["b", "g"],
		]);
	});
});
