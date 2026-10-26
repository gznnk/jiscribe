import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import { createTestState } from "../../../../../reducer/__tests__/support/createTestState";
import { rectDoc } from "../../../../../reducer/__tests__/support/fixtures";
import { createCanvasRegistries } from "../../../../../registries/createCanvasRegistries";
import { createCowObjects } from "../../../../../utils/cowObjects";
import { RectIcon } from "../../../../objects/primitives/RectIcon";
import type { StencilCategory } from "../../../../objects/StencilCategory";
import { resolveStencilCategories } from "../../../StencilLibrary/utils/resolveStencilCategory";
import {
	buildCategoryIdsByObjectType,
	tallyDocumentCategories,
	type DocumentCategoryTally,
} from "../tallyDocumentCategories";

const { stencil } = createCanvasRegistries();

const categoryOf = (id: string, presetIds: string[]): StencilCategory => ({
	id,
	label: id,
	icon: RectIcon,
	presetIds,
});

/**
 * Three sections over core's types: `boxes` and `mixed` both list the rect, the
 * way flowchart lists a rect-typed `process` beside a type of its own.
 */
const librarySections = resolveStencilCategories(
	[
		categoryOf("boxes", ["rect"]),
		categoryOf("rounds", ["ellipse"]),
		categoryOf("mixed", ["polygon", "rect"]),
	],
	stencil,
);

const resolvePresets = (presetIds: string[]) =>
	presetIds
		.map((presetId) => stencil.get(presetId))
		.filter((preset) => preset !== undefined);

/** The rail holding only the text tool, so no section's type is a rail preset's. */
const textOnlyRailLookup = buildCategoryIdsByObjectType(
	librarySections,
	resolvePresets(["text"]),
);

const ellipseDoc = (id: string): unknown => ({
	id,
	type: "ellipse",
	x: 0,
	y: 0,
	width: 10,
	height: 10,
});

const polygonDoc = (id: string): unknown => ({
	id,
	type: "polygon",
	points: [
		{ x: 0, y: 0 },
		{ x: 10, y: 0 },
		{ x: 5, y: 10 },
	],
});

const objectsOf = (root: unknown[]) =>
	createTestState({ version: 1, root } as CanvasDoc).objects;

const tallyOf = (
	objects: Record<string, ObjectState>,
	previousTally: DocumentCategoryTally | null = null,
	categoryIdsByObjectType = textOnlyRailLookup,
) =>
	tallyDocumentCategories(
		objects,
		categoryIdsByObjectType,
		librarySections,
		previousTally,
	);

const rank = (root: unknown[], categoryIdsByObjectType = textOnlyRailLookup) =>
	tallyOf(objectsOf(root), null, categoryIdsByObjectType).rankedCategoryIds;

/**
 * `objects` behind a Proxy counting the walks over its keys: a full count
 * enumerates them (through a copy-on-write view too, which reads its base's),
 * a count adjusted from the written ids does not.
 */
const countingKeyWalks = (objects: Record<string, ObjectState>) => {
	const walks = { count: 0 };
	const counted = new Proxy(objects, {
		ownKeys(target) {
			walks.count++;
			return Reflect.ownKeys(target);
		},
	});
	return { counted, walks };
};

describe("buildCategoryIdsByObjectType", () => {
	it("maps a type every section listing it, in section order", () => {
		expect(textOnlyRailLookup.get("rect")).toEqual(["boxes", "mixed"]);
		expect(textOnlyRailLookup.get("ellipse")).toEqual(["rounds"]);
		expect(textOnlyRailLookup.get("polygon")).toEqual(["mixed"]);
	});

	it("leaves out every type a rail preset creates", () => {
		const lookup = buildCategoryIdsByObjectType(
			librarySections,
			resolvePresets(["rect", "ellipse"]),
		);
		expect([...lookup.keys()]).toEqual(["polygon"]);
	});
});

describe("tallyDocumentCategories", () => {
	it("counts a type toward every category listing it", () => {
		expect(rank([rectDoc("rect-1", 0, 0)])).toEqual(["boxes", "mixed"]);
	});

	it("adds no category for a type a rail preset creates", () => {
		const lookup = buildCategoryIdsByObjectType(
			librarySections,
			resolvePresets(["rect"]),
		);
		expect(rank([rectDoc("rect-1", 0, 0)], lookup)).toEqual([]);
		expect(
			rank([rectDoc("rect-1", 0, 0), polygonDoc("polygon-1")], lookup),
		).toEqual(["mixed"]);
	});

	it("counts the children of nested groups", () => {
		expect(
			rank([
				{
					id: "outer",
					type: "group",
					children: [
						{ id: "inner", type: "group", children: [ellipseDoc("ellipse-1")] },
						rectDoc("rect-1", 20, 20),
					],
				},
			]),
		).toEqual(["boxes", "rounds", "mixed"]);
	});

	it("orders by object count, most first, ties in section order", () => {
		// rounds 3, mixed 2 (one rect, one polygon), boxes 1
		expect(
			rank([
				ellipseDoc("ellipse-1"),
				ellipseDoc("ellipse-2"),
				ellipseDoc("ellipse-3"),
				rectDoc("rect-1", 0, 0),
				polygonDoc("polygon-1"),
			]),
		).toEqual(["rounds", "mixed", "boxes"]);
		// boxes and mixed tie at 1 each, rounds at 1: section order
		expect(rank([ellipseDoc("ellipse-1"), rectDoc("rect-1", 0, 0)])).toEqual([
			"boxes",
			"rounds",
			"mixed",
		]);
	});

	it("uses no category for a document without a listed type, or with no library", () => {
		expect(rank([])).toEqual([]);
		expect(
			tallyDocumentCategories(
				objectsOf([rectDoc("rect-1", 0, 0)]),
				buildCategoryIdsByObjectType([], []),
				[],
				null,
			).rankedCategoryIds,
		).toEqual([]);
	});

	it("keeps the previous ranking's array while the ids and their order are unchanged", () => {
		const previousTally = tallyOf(objectsOf([rectDoc("rect-1", 0, 0)]));
		// Moved, a second rect added: the same categories in the same order
		const unchanged = tallyOf(
			objectsOf([rectDoc("rect-1", 50, 50), rectDoc("rect-2", 0, 0)]),
			previousTally,
		);
		expect(unchanged.rankedCategoryIds).toBe(previousTally.rankedCategoryIds);

		const reordered = tallyOf(
			objectsOf([
				polygonDoc("polygon-1"),
				polygonDoc("polygon-2"),
				rectDoc("rect-1", 0, 0),
			]),
			previousTally,
		);
		expect(reordered.rankedCategoryIds).not.toBe(
			previousTally.rankedCategoryIds,
		);
		expect(reordered.rankedCategoryIds).toEqual(["mixed", "boxes"]);
	});

	it("hands the previous tally back for the very map it counted", () => {
		const objects = objectsOf([rectDoc("rect-1", 0, 0)]);
		const previousTally = tallyOf(objects);
		expect(tallyOf(objects, previousTally)).toBe(previousTally);
	});

	describe("on a copy-on-write step of the counted map", () => {
		const baseObjects = objectsOf([
			rectDoc("rect-1", 0, 0),
			ellipseDoc("ellipse-1"),
		]);
		const polygonState = objectsOf([polygonDoc("polygon-1")])["polygon-1"];

		it("keeps the ranking through moves without walking the map", () => {
			const { counted, walks } = countingKeyWalks(baseObjects);
			const baseTally = tallyOf(counted);
			expect(walks.count).toBe(1);

			const firstStep = createCowObjects(counted);
			firstStep["rect-1"] = { ...baseObjects["rect-1"], parentId: undefined };
			const firstTally = tallyOf(firstStep, baseTally);
			const secondStep = createCowObjects(firstStep);
			secondStep["ellipse-1"] = { ...baseObjects["ellipse-1"] };
			const secondTally = tallyOf(secondStep, firstTally);

			expect(walks.count).toBe(1);
			expect(firstTally.rankedCategoryIds).toBe(baseTally.rankedCategoryIds);
			expect(secondTally.rankedCategoryIds).toBe(baseTally.rankedCategoryIds);
			expect(secondTally.objects).toBe(secondStep);
		});

		it("adjusts the counts for an added object, a type change, and an object only the older step held", () => {
			const { counted, walks } = countingKeyWalks(baseObjects);
			const baseTally = tallyOf(counted);
			expect(Object.fromEntries(baseTally.objectCountByCategoryId)).toEqual({
				boxes: 1,
				rounds: 1,
				mixed: 1,
			});

			const added = createCowObjects(counted);
			added["polygon-1"] = polygonState;
			const addedTally = tallyOf(added, baseTally);
			expect(Object.fromEntries(addedTally.objectCountByCategoryId)).toEqual({
				boxes: 1,
				rounds: 1,
				mixed: 2,
			});
			expect(addedTally.rankedCategoryIds).toEqual([
				"mixed",
				"boxes",
				"rounds",
			]);

			// The rect turned into an ellipse under the same id.
			const retyped = createCowObjects(added);
			retyped["rect-1"] = { ...baseObjects["ellipse-1"], id: "rect-1" };
			const retypedTally = tallyOf(retyped, addedTally);
			expect(Object.fromEntries(retypedTally.objectCountByCategoryId)).toEqual({
				rounds: 2,
				mixed: 1,
			});

			// A step built from the base again, without the polygon the older one added.
			const withoutPolygon = createCowObjects(counted);
			withoutPolygon["rect-1"] = retyped["rect-1"];
			const withoutPolygonTally = tallyOf(withoutPolygon, retypedTally);
			expect(
				Object.fromEntries(withoutPolygonTally.objectCountByCategoryId),
			).toEqual({ rounds: 2 });
			expect(withoutPolygonTally.rankedCategoryIds).toEqual(["rounds"]);

			expect(walks.count).toBe(1);
		});

		it("walks the whole map when it shares no backing record with the counted one", () => {
			const baseTally = tallyOf(baseObjects);
			const { counted, walks } = countingKeyWalks(
				objectsOf([polygonDoc("polygon-1")]),
			);
			const reloadedTally = tallyOf(counted, baseTally);
			expect(walks.count).toBe(1);
			expect(reloadedTally.rankedCategoryIds).toEqual(["mixed"]);
		});

		it("walks the whole map again under another lookup", () => {
			const { counted, walks } = countingKeyWalks(baseObjects);
			const baseTally = tallyOf(counted);
			const step = createCowObjects(counted);
			step["rect-1"] = { ...baseObjects["rect-1"] };
			const rectRailLookup = buildCategoryIdsByObjectType(
				librarySections,
				resolvePresets(["rect"]),
			);
			const relookedTally = tallyOf(step, baseTally, rectRailLookup);
			expect(walks.count).toBe(2);
			expect(relookedTally.rankedCategoryIds).toEqual(["rounds"]);
		});
	});
});
