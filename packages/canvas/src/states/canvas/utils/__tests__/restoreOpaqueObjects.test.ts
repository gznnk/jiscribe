import type { ObjectDoc } from "@jiscribe/doc/model/objects/base/ObjectDoc";
import type { OpaqueObjectDoc } from "@jiscribe/doc/model/objects/base/OpaqueObjectDoc";
import type { GroupDoc } from "@jiscribe/doc/model/objects/primitives/group/GroupDoc";
import { describe, expect, it } from "vitest";

import { rebrand } from "../../../objects/utils/rebrand";
import type {
	OpaqueObjectLoadedPlace,
	OpaqueObjectPlacement,
} from "../../OpaqueObjectPlacement";
import { restoreOpaqueObjects } from "../restoreOpaqueObjects";

const rect = (id: string): ObjectDoc => ({ id, type: "rect" });
const group = (id: string, children: ObjectDoc[]): ObjectDoc =>
	({ id, type: "group", children }) as ObjectDoc;

/** An opaque object of a type nothing here understands. */
const opaque = (
	id: string,
	children: readonly unknown[] = [],
): OpaqueObjectDoc =>
	rebrand<OpaqueObjectDoc>({ id, type: "hexagram", children });
const opaqueConnector = (
	id: string,
	sourceId: string,
	targetId: string,
): OpaqueObjectDoc =>
	rebrand<OpaqueObjectDoc>({
		id,
		type: "connector",
		source: { owner: { id: sourceId }, anchor: { kind: "center" } },
		target: { owner: { id: targetId }, anchor: { kind: "center" } },
	});

/**
 * One container it sat in: `knownSiblingIds` in drawing order, and how many of
 * them came before it.
 */
const place = (
	parentId: string | undefined,
	knownSiblingIds: readonly string[],
	precedingSiblingCount: number,
): OpaqueObjectLoadedPlace => ({
	parentId,
	knownSiblingIds,
	precedingSiblingCount,
});

const placement = (
	doc: OpaqueObjectDoc,
	...loadedPlaces: readonly OpaqueObjectLoadedPlace[]
): OpaqueObjectPlacement => ({ doc, loadedPlaces });

const idsOf = (children: readonly ObjectDoc[]): string[] =>
	children.map(({ id }) => id);
const childIdsOf = (root: readonly ObjectDoc[], groupId: string): string[] =>
	idsOf((root.find(({ id }) => id === groupId) as GroupDoc).children);

describe("restoreOpaqueObjects", () => {
	it("puts one back after the sibling it was drawn after", () => {
		const root = [rect("r1"), rect("r2")];

		restoreOpaqueObjects(root, [
			placement(opaque("h1"), place(undefined, ["r1", "r2"], 1)),
		]);

		expect(idsOf(root)).toEqual(["r1", "h1", "r2"]);
	});

	it("falls back to the one before it when that sibling is gone", () => {
		const root = [rect("r1"), rect("r3")];

		restoreOpaqueObjects(root, [
			placement(opaque("h1"), place(undefined, ["r1", "r2", "r3"], 2)),
		]);

		expect(idsOf(root)).toEqual(["r1", "h1", "r3"]);
	});

	it("goes to the front when none of the preceding siblings remain", () => {
		const root = [rect("r3")];

		restoreOpaqueObjects(root, [
			placement(opaque("h1"), place(undefined, ["r1", "r2", "r3"], 2)),
		]);

		expect(idsOf(root)).toEqual(["h1", "r3"]);
	});

	it("goes back inside the group that held it", () => {
		const root = [rect("r0"), group("g1", [rect("r1"), rect("r2")])];

		restoreOpaqueObjects(root, [
			placement(
				opaque("h1"),
				place("g1", ["r1", "r2"], 1),
				place(undefined, ["r0", "g1"], 2),
			),
		]);

		expect(idsOf(root)).toEqual(["r0", "g1"]);
		expect(childIdsOf(root, "g1")).toEqual(["r1", "h1", "r2"]);
	});

	it("lands where the group was when the group is gone around it", () => {
		const root = [rect("r0"), rect("r1")];

		restoreOpaqueObjects(root, [
			placement(
				opaque("h1"),
				place("g1", ["r1"], 1),
				place(undefined, ["r0", "g1"], 2),
			),
		]);

		expect(idsOf(root)).toEqual(["r0", "h1", "r1"]);
	});

	it("keeps the document order of two objects going back to the same point", () => {
		const root = [rect("r1")];

		restoreOpaqueObjects(root, [
			placement(opaque("h1"), place(undefined, ["r1"], 1)),
			placement(opaque("h2"), place(undefined, ["r1"], 1)),
		]);

		expect(idsOf(root)).toEqual(["r1", "h1", "h2"]);
	});

	it("drops an opaque connector whose end object is no longer in the tree", () => {
		const root = [rect("r1")];

		restoreOpaqueObjects(root, [
			placement(opaqueConnector("c1", "r1", "r2"), place(undefined, ["r1"], 1)),
		]);

		expect(idsOf(root)).toEqual(["r1"]);
	});

	it("keeps an opaque connector whose ends are all still there", () => {
		const root = [rect("r1"), rect("r2")];

		restoreOpaqueObjects(root, [
			placement(
				opaqueConnector("c1", "r1", "r2"),
				place(undefined, ["r1", "r2"], 2),
			),
		]);

		expect(idsOf(root)).toEqual(["r1", "r2", "c1"]);
	});

	it("counts an end inside another opaque object as still there", () => {
		const root = [rect("r1")];

		restoreOpaqueObjects(root, [
			placement(
				opaque("h1", [{ id: "h1-inner" }]),
				place(undefined, ["r1"], 1),
			),
			placement(
				opaqueConnector("c1", "r1", "h1-inner"),
				place(undefined, ["r1"], 1),
			),
		]);

		expect(idsOf(root)).toEqual(["r1", "h1", "c1"]);
	});

	it("returns the root it was given, spliced in place", () => {
		const root = [rect("r1")];

		expect(
			restoreOpaqueObjects(root, [
				placement(opaque("h1"), place(undefined, ["r1"], 1)),
			]),
		).toBe(root);
	});
});
