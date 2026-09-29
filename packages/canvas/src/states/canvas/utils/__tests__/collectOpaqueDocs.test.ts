import type { ObjectDoc } from "@jiscribe/doc/model/objects/base/ObjectDoc";
import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import { describe, expect, it } from "vitest";

import { collectOpaqueDocs } from "../collectOpaqueDocs";

const knownTypes = new Set<ObjectType>(["rect", "group", "connector"]);
const isKnownType = (type: ObjectType): boolean => knownTypes.has(type);

const rect = (id: string): ObjectDoc => ({ id, type: "rect" });
/** A type `isKnownType` does not carry, holding children nothing here reads. */
const hexagram = (id: string, children: readonly ObjectDoc[] = []): ObjectDoc =>
	({ id, type: "hexagram", children }) as ObjectDoc;
const group = (id: string, children: readonly ObjectDoc[]): ObjectDoc =>
	({ id, type: "group", children }) as ObjectDoc;
const connector = (id: string, sourceId: string, targetId: string): ObjectDoc =>
	({
		id,
		type: "connector",
		source: { owner: { id: sourceId }, anchor: { kind: "center" } },
		target: { owner: { id: targetId }, anchor: { kind: "center" } },
	}) as ObjectDoc;

/** The ids of what was held, sorted, since the answer is a set. */
const heldIdsOf = (opaqueDocs: ReadonlySet<ObjectDoc>): string[] =>
	[...opaqueDocs].map(({ id }) => id).sort();

describe("collectOpaqueDocs", () => {
	it("holds an object of a type it is not given", () => {
		const opaqueDocs = collectOpaqueDocs(
			[rect("r1"), hexagram("h1")],
			isKnownType,
		);

		expect(heldIdsOf(opaqueDocs)).toEqual(["h1"]);
	});

	it("holds a group with nothing left to draw whole, children included", () => {
		const opaqueDocs = collectOpaqueDocs(
			[group("g1", [hexagram("h1"), hexagram("h2")])],
			isKnownType,
		);

		expect(heldIdsOf(opaqueDocs)).toEqual(["g1", "h1", "h2"]);
	});

	it("holds only the opaque child of a group that still draws something", () => {
		const groupDoc = group("g1", [rect("r1"), hexagram("h1")]);

		const opaqueDocs = collectOpaqueDocs([groupDoc], isKnownType);

		expect(heldIdsOf(opaqueDocs)).toEqual(["h1"]);
		expect(opaqueDocs.has(groupDoc)).toBe(false);
	});

	it("does not hold a doc nested in an opaque one on its own", () => {
		const nestedDoc = hexagram("h1-inner");

		const opaqueDocs = collectOpaqueDocs(
			[rect("r1"), hexagram("h1", [nestedDoc])],
			isKnownType,
		);

		expect(heldIdsOf(opaqueDocs)).toEqual(["h1"]);
		expect(opaqueDocs.has(nestedDoc)).toBe(false);
	});

	it("takes along a connector with an end on an opaque object", () => {
		const opaqueDocs = collectOpaqueDocs(
			[rect("r1"), hexagram("h1"), connector("c1", "r1", "h1")],
			isKnownType,
		);

		expect(heldIdsOf(opaqueDocs)).toEqual(["c1", "h1"]);
	});

	it("leaves a connector whose ends are both on objects that stay", () => {
		const opaqueDocs = collectOpaqueDocs(
			[
				rect("r1"),
				group("g1", [rect("r2")]),
				connector("c1", "r1", "r2"),
				hexagram("h1"),
			],
			isKnownType,
		);

		expect(heldIdsOf(opaqueDocs)).toEqual(["h1"]);
	});

	it("holds nothing for a document of known types only", () => {
		const opaqueDocs = collectOpaqueDocs(
			[rect("r1"), group("g1", [rect("r2")]), connector("c1", "r1", "r2")],
			isKnownType,
		);

		expect(opaqueDocs.size).toBe(0);
	});
});
