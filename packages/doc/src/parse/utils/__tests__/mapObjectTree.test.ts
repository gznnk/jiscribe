import { describe, expect, it } from "vitest";

import type { ObjectTreeNode } from "../mapObjectTree";
import { mapObjectTree } from "../mapObjectTree";

const keep = (node: ObjectTreeNode): ObjectTreeNode => node;

const tree = () => [
	{ id: "a", type: "rect" },
	{
		id: "g",
		type: "group",
		children: [
			{ id: "b", type: "rect" },
			{ id: "c", type: "ellipse" },
		],
	},
	"not an object",
];

describe("mapObjectTree", () => {
	it("returns the very same array when the visitor changes nothing", () => {
		const entries = tree();
		expect(mapObjectTree(entries, "root", { enter: keep })).toBe(entries);
	});

	it("visits every object in document order with its path, and not the non-objects", () => {
		const visited: string[] = [];
		mapObjectTree(tree(), "root", {
			enter: (node, path) => {
				visited.push(`${path}:${String(node.id)}`);
				return node;
			},
		});
		expect(visited).toEqual([
			"root[0]:a",
			"root[1]:g",
			"root[1].children[0]:b",
			"root[1].children[1]:c",
		]);
	});

	it("copies only along the path of a changed node", () => {
		const entries = tree();
		const walked = mapObjectTree(entries, "root", {
			enter: (node) => (node.id === "c" ? { ...node, x: 1 } : node),
		}) as unknown[];
		expect(walked).not.toBe(entries);
		expect(walked[0]).toBe(entries[0]);
		expect(walked[1]).not.toBe(entries[1]);
		expect((walked[1] as ObjectTreeNode).children).toEqual([
			{ id: "b", type: "rect" },
			{ id: "c", type: "ellipse", x: 1 },
		]);
		expect(walked[2]).toBe("not an object");
	});

	it("drops a node the visitor returns undefined for, children included", () => {
		const walked = mapObjectTree(tree(), "root", {
			enter: (node) => (node.id === "g" ? undefined : node),
		}) as unknown[];
		expect(
			walked.map((entry) => (entry as ObjectTreeNode).id ?? entry),
		).toEqual(["a", "not an object"]);
	});

	it("lets leave see the walked children and drop the node", () => {
		const walked = mapObjectTree(tree(), "root", {
			enter: (node) => (node.type === "rect" ? undefined : node),
			leave: (node) =>
				node.type === "group" && (node.children as unknown[]).length === 0
					? undefined
					: node,
		}) as unknown[];
		expect(walked).toEqual([
			{ id: "g", type: "group", children: [{ id: "c", type: "ellipse" }] },
			"not an object",
		]);
	});

	it("calls leave only on a node it descended into", () => {
		const left: string[] = [];
		mapObjectTree(
			[...tree(), { id: "e", type: "group", children: [] }],
			"root",
			{
				enter: keep,
				leave: (node) => {
					left.push(String(node.id));
					return node;
				},
			},
		);
		expect(left).toEqual(["g"]);
	});

	it("does not descend where the visitor says not to", () => {
		const visited: string[] = [];
		mapObjectTree(tree(), "root", {
			enter: (node) => {
				visited.push(String(node.id));
				return node;
			},
			descend: () => false,
		});
		expect(visited).toEqual(["a", "g"]);
	});

	it("passes anything that is not an array through", () => {
		expect(mapObjectTree("root", "root", { enter: keep })).toBe("root");
	});
});
