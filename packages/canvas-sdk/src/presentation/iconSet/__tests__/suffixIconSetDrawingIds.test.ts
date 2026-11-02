import { describe, expect, it } from "vitest";

import type { IconSetNode } from "../../../schema/iconSet/IconSetTypes";
import { suffixIconSetDrawingIds } from "../suffixIconSetDrawingIds";

/** A gradient inheriting from another, a clipPath, and the elements using them. */
const NODES: readonly IconSetNode[] = [
	[
		"linearGradient",
		{ id: "set-icon-0", x1: "0" },
		[["stop", { offset: "0" }]],
	],
	["linearGradient", { id: "set-icon-1", href: "#set-icon-0" }],
	["clipPath", { id: "set-icon-2" }, [["rect", { width: "4", height: "4" }]]],
	[
		"g",
		{ clipPath: "url(#set-icon-2)" },
		[
			["path", { d: "M0 0", fill: "url(#set-icon-1)", stroke: "#000" }],
			["path", { d: "M1 1", fill: "url(#elsewhere)" }],
		],
	],
];
const ID_REFS = ["set-icon-0", "set-icon-1", "set-icon-2"];

/** Every id defined and every id referred to, in document order. */
const readIds = (
	nodes: readonly IconSetNode[],
): { defined: string[]; referenced: string[] } => {
	const defined: string[] = [];
	const referenced: string[] = [];
	const walk = (list: readonly IconSetNode[]): void => {
		for (const [, attrs, children] of list) {
			for (const [name, value] of Object.entries(attrs)) {
				if (name === "id") {
					defined.push(value);
				} else if (name === "href") {
					referenced.push(value.slice(1));
				} else {
					for (const [, id] of value.matchAll(/url\(#([^)]+)\)/g)) {
						referenced.push(id);
					}
				}
			}
			walk(children ?? []);
		}
	};
	walk(nodes);
	return { defined, referenced };
};

describe("suffixIconSetDrawingIds", () => {
	it("suffixes the ids and every reference to them alike", () => {
		const { defined, referenced } = readIds(
			suffixIconSetDrawingIds(NODES, ID_REFS, "r1"),
		);

		expect(defined).toEqual([
			"set-icon-0-r1",
			"set-icon-1-r1",
			"set-icon-2-r1",
		]);
		expect(referenced).toEqual([
			"set-icon-0-r1",
			"set-icon-2-r1",
			"set-icon-1-r1",
			"elsewhere",
		]);
	});

	it("gives two suffixes two disjoint sets of ids", () => {
		const first = readIds(suffixIconSetDrawingIds(NODES, ID_REFS, "r1"));
		const second = readIds(suffixIconSetDrawingIds(NODES, ID_REFS, "r2"));

		expect(first.defined.filter((id) => second.defined.includes(id))).toEqual(
			[],
		);
	});

	it("leaves everything but ids and references untouched", () => {
		const suffixed = suffixIconSetDrawingIds(NODES, ID_REFS, "r1");

		expect(suffixed[3][2]?.[0][1]).toEqual({
			d: "M0 0",
			fill: "url(#set-icon-1-r1)",
			stroke: "#000",
		});
		expect(suffixed[0][2]).toEqual(NODES[0][2]);
	});

	it("returns a drawing with no ids as it is", () => {
		expect(suffixIconSetDrawingIds(NODES, [], "r1")).toBe(NODES);
	});
});
