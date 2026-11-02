import { describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../model/canvas/CanvasDoc";
import type { ObjectDoc } from "../../model/objects/base/ObjectDoc";
import { createIdAllocator } from "../utils/ids";

/** A bare object; the allocator reads nothing but `id` and a group's `children`. */
const leaf = (id: string): ObjectDoc => ({ id, type: "rect" }) as ObjectDoc;

const group = (id: string, children: ObjectDoc[]): ObjectDoc =>
	({ id, type: "group", children }) as ObjectDoc;

const flattenIds = (objects: readonly ObjectDoc[]): string[] =>
	objects.flatMap((object) => {
		const children = (object as { children?: ObjectDoc[] }).children;
		return [object.id, ...(children === undefined ? [] : flattenIds(children))];
	});

/**
 * What allocation is defined as: the lowest `${prefix}-N` free in the whole tree and among
 * the ids already handed out, scanned from 1 for every id.
 */
const allocateFromScratch = (
	doc: CanvasDoc,
	prefixes: readonly string[],
): string[] => {
	const usedIds = new Set(flattenIds(doc.root));
	return prefixes.map((prefix) => {
		let index = 1;
		while (usedIds.has(`${prefix}-${index}`)) {
			index += 1;
		}
		usedIds.add(`${prefix}-${index}`);
		return `${prefix}-${index}`;
	});
};

const allocateAll = (doc: CanvasDoc, prefixes: readonly string[]): string[] => {
	const allocateId = createIdAllocator(doc);
	return prefixes.map((prefix) => allocateId(prefix));
};

describe("createIdAllocator", () => {
	it("fills the holes in the tree before carrying on past its last id", () => {
		const doc: CanvasDoc = {
			version: 1,
			root: [leaf("connector-1"), leaf("connector-3"), leaf("connector-6")],
		};
		const prefixes = Array.from({ length: 5 }, () => "connector");

		expect(allocateAll(doc, prefixes)).toEqual([
			"connector-2",
			"connector-4",
			"connector-5",
			"connector-7",
			"connector-8",
		]);
		expect(allocateAll(doc, prefixes)).toEqual(
			allocateFromScratch(doc, prefixes),
		);
	});

	it("sees the ids held inside groups, nested ones included", () => {
		const doc: CanvasDoc = {
			version: 1,
			root: [
				leaf("rect-1"),
				group("group-1", [leaf("rect-2"), group("group-2", [leaf("rect-4")])]),
			],
		};
		const prefixes = ["rect", "rect", "group", "rect"];

		expect(allocateAll(doc, prefixes)).toEqual([
			"rect-3",
			"rect-5",
			"group-3",
			"rect-6",
		]);
		expect(allocateAll(doc, prefixes)).toEqual(
			allocateFromScratch(doc, prefixes),
		);
	});

	it("keeps each prefix's numbering apart when prefixes alternate", () => {
		const doc: CanvasDoc = {
			version: 1,
			root: [
				leaf("rect-2"),
				leaf("ellipse-1"),
				group("group-1", [leaf("ellipse-3"), leaf("rect-3")]),
			],
		};
		const prefixes = ["rect", "ellipse", "rect", "ellipse", "rect", "ellipse"];

		expect(allocateAll(doc, prefixes)).toEqual([
			"rect-1",
			"ellipse-2",
			"rect-4",
			"ellipse-4",
			"rect-5",
			"ellipse-5",
		]);
		expect(allocateAll(doc, prefixes)).toEqual(
			allocateFromScratch(doc, prefixes),
		);
	});
});
