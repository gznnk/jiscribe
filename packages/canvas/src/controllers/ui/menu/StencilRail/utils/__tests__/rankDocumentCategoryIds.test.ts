import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { describe, expect, it } from "vitest";

import { createTestState } from "../../../../../reducer/__tests__/support/createTestState";
import { rectDoc } from "../../../../../reducer/__tests__/support/fixtures";
import { createCanvasRegistries } from "../../../../../registries/createCanvasRegistries";
import { RectIcon } from "../../../../objects/primitives/RectIcon";
import type { StencilCategory } from "../../../../objects/StencilCategory";
import { resolveStencilCategories } from "../../../StencilLibrary/utils/resolveStencilCategory";
import {
	buildCategoryIdsByObjectType,
	rankDocumentCategoryIds,
} from "../rankDocumentCategoryIds";

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

const rank = (root: unknown[], previousRankedIds: readonly string[] = []) =>
	rankDocumentCategoryIds(
		objectsOf(root),
		textOnlyRailLookup,
		librarySections,
		previousRankedIds,
	);

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

describe("rankDocumentCategoryIds", () => {
	it("counts a type toward every category listing it", () => {
		expect(rank([rectDoc("rect-1", 0, 0)])).toEqual(["boxes", "mixed"]);
	});

	it("adds no category for a type a rail preset creates", () => {
		const lookup = buildCategoryIdsByObjectType(
			librarySections,
			resolvePresets(["rect"]),
		);
		expect(
			rankDocumentCategoryIds(
				objectsOf([rectDoc("rect-1", 0, 0)]),
				lookup,
				librarySections,
				[],
			),
		).toEqual([]);
		expect(
			rankDocumentCategoryIds(
				objectsOf([rectDoc("rect-1", 0, 0), polygonDoc("polygon-1")]),
				lookup,
				librarySections,
				[],
			),
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
			rankDocumentCategoryIds(
				objectsOf([rectDoc("rect-1", 0, 0)]),
				buildCategoryIdsByObjectType([], []),
				[],
				[],
			),
		).toEqual([]);
	});

	it("hands the previous result back while the ids and their order are unchanged", () => {
		const previousRankedIds = rank([rectDoc("rect-1", 0, 0)]);
		// Moved, a second rect added: the same categories in the same order
		const unchanged = rank(
			[rectDoc("rect-1", 50, 50), rectDoc("rect-2", 0, 0)],
			previousRankedIds,
		);
		expect(unchanged).toBe(previousRankedIds);

		const reordered = rank(
			[
				polygonDoc("polygon-1"),
				polygonDoc("polygon-2"),
				rectDoc("rect-1", 0, 0),
			],
			previousRankedIds,
		);
		expect(reordered).not.toBe(previousRankedIds);
		expect(reordered).toEqual(["mixed", "boxes"]);
	});
});
