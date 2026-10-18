import { createCanvasRegistries } from "@jiscribe/canvas";
import type { ConnectionAnchors } from "@jiscribe/canvas";
import { TEXT_SLOT_PART_KIND } from "@jiscribe/canvas-sdk";
import { describe, expect, it } from "vitest";

import { GRIP_THICKNESS } from "../controls/ErEntityGrip";
import { erEntityDefinition } from "../definition";
import { erPlugin } from "../plugin";
import { calcErEntityTextSlotRegions } from "../presentation/calcErEntityTextSlotRegions";
import { erEntityColumnTextSlotId } from "../schema/erEntityColumnIds";
import { ER_ENTITY_NAME_TEXT_SLOT_ID } from "../schema/ErEntityDoc";
import type { ErEntityDoc } from "../schema/ErEntityDoc";
import { erEntityToState } from "../state/ErEntityMapper";

const makeState = (columns: ErEntityDoc["columns"]) =>
	erEntityToState({
		id: "e-1",
		type: "erEntity",
		x: 0,
		y: 0,
		nameWidth: 96,
		typeWidth: 100,
		name: "users",
		columns,
	} as ErEntityDoc);

/** The anchors the definition declares for one entity, at 100% unless a zoom is given. */
const anchorsOf = (
	columns: ErEntityDoc["columns"],
	zoom = 1,
): ConnectionAnchors => {
	const declaration = erEntityDefinition.connectionAnchors;
	if (typeof declaration !== "function") {
		throw new Error("erEntity declares its anchors per object");
	}
	return declaration(makeState(columns), zoom);
};

describe("erEntityDefinition.connectionAnchors", () => {
	it("hides the left and right midpoints while the entity has a column", () => {
		const anchors = anchorsOf([{ name: "id" }, { name: "email" }]);
		expect(anchors.leftCenter).toEqual({ hidden: true });
		expect(anchors.rightCenter).toEqual({ hidden: true });
		expect(anchors["col:0:left"]?.offset).toBeGreaterThan(0);
		expect(anchors["col:1:left"]?.offset).toBeGreaterThan(0);
	});

	it("pushes the left points and the top midpoint out past the grips, by the grips' thickness on screen", () => {
		const columns = [{ name: "id" }, { name: "email" }];
		const atOne = anchorsOf(columns, 1);
		const atTwo = anchorsOf(columns, 2);
		expect(atOne["col:0:right"]).toBeUndefined();
		expect(atOne["col:1:right"]).toBeUndefined();
		expect(atOne.bottomCenter).toBeUndefined();
		// The grips are sized in world units, so twice the zoom puts the left
		// points and the top midpoint a grip's thickness further out on screen.
		for (const anchorId of ["col:0:left", "col:1:left", "topCenter"]) {
			expect(
				(atTwo[anchorId]?.offset ?? 0) - (atOne[anchorId]?.offset ?? 0),
			).toBe(GRIP_THICKNESS);
		}
	});

	it("offers every midpoint on an entity of no columns, the same answer each time", () => {
		const anchors = anchorsOf([]);
		expect(anchors).toEqual({});
		expect(anchorsOf([])).toBe(anchors);
	});
});

describe("erEntityDefinition.textEditLineBreaks", () => {
	it("keeps line breaks in the title and rejects them in every column slot", () => {
		const resolve = erEntityDefinition.textEditLineBreaks;
		expect(resolve).toBeDefined();
		expect(resolve?.(ER_ENTITY_NAME_TEXT_SLOT_ID)).toBe("allow");
		expect(resolve?.(erEntityColumnTextSlotId(0, "key"))).toBe("reject");
		expect(resolve?.(erEntityColumnTextSlotId(0, "name"))).toBe("reject");
		expect(resolve?.(erEntityColumnTextSlotId(0, "type"))).toBe("reject");
	});
});

describe("erEntityDefinition.extraConnectPointIds", () => {
	const makeDoc = (columns: ErEntityDoc["columns"]): ErEntityDoc =>
		({
			id: "e-1",
			type: "erEntity",
			x: 0,
			y: 0,
			name: "users",
			columns,
		}) as ErEntityDoc;

	it.each([
		["no columns", []],
		["one column", [{ key: "PK", name: "id" }]],
		[
			"three columns",
			[
				{ key: "PK", name: "id" },
				{ name: "email" },
				{ key: "FK", name: "org_id" },
			],
		],
	] satisfies [string, ErEntityDoc["columns"]][])(
		"lists the ids the presentation places, in its order, on an entity of %s",
		(_label, columns) => {
			const doc = makeDoc(columns);
			const placedIds = erEntityDefinition
				.extraConnectPoints?.(erEntityDefinition.mapper.toState(doc))
				.map((point) => point.id);
			expect(placedIds).toHaveLength(columns.length * 2);
			expect(erEntityDefinition.extraConnectPointIds?.(doc)).toEqual(placedIds);
		},
	);

	it("offers none on a doc whose columns is not an array", () => {
		const doc = { ...makeDoc([]), columns: "id" } as unknown as ErEntityDoc;
		expect(erEntityDefinition.extraConnectPointIds?.(doc)).toEqual([]);
	});
});

describe("the registered erEntity text slot kind", () => {
	const partKind = createCanvasRegistries({
		plugins: [erPlugin],
	}).objectPartKind.get("erEntity", TEXT_SLOT_PART_KIND);

	it("places one slot alone where it places every slot", () => {
		const state = makeState([
			{ key: "PK", name: "id", type: "bigint" },
			{ name: "email" },
		]);
		const regions = calcErEntityTextSlotRegions(state);
		for (const slotId of Object.keys(state.text)) {
			expect(partKind?.region?.(state, slotId)).toEqual(regions[slotId]);
			expect(partKind?.regions?.(state)[slotId]).toEqual(regions[slotId]);
		}
	});
});
