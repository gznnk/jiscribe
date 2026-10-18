import { createCanvasRegistries } from "@jiscribe/canvas";
import type { ConnectionAnchors } from "@jiscribe/canvas";
import { TEXT_SLOT_PART_KIND } from "@jiscribe/canvas-sdk";
import { describe, expect, it } from "vitest";

import {
	ER_ENTITY_COLUMN_GRIP_GAP,
	ER_ENTITY_COLUMN_GRIP_WIDTH,
} from "../controls/ErEntityColumnGrip";
import { erEntityDefinition } from "../definition";
import { erPlugin } from "../plugin";
import { calcErEntityTextSlotRegions } from "../presentation/calcErEntityTextSlotRegions";
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

	it("pushes the left points alone out past the grips, by the grips' width on screen", () => {
		const columns = [{ name: "id" }, { name: "email" }];
		const atOne = anchorsOf(columns, 1);
		const atTwo = anchorsOf(columns, 2);
		expect(atOne["col:0:right"]).toBeUndefined();
		expect(atOne["col:1:right"]).toBeUndefined();
		// The grips are drawn in the entity's own coordinates, so twice the zoom
		// puts the left point a grip and its gap further out on screen.
		expect(
			(atTwo["col:0:left"]?.offset ?? 0) - (atOne["col:0:left"]?.offset ?? 0),
		).toBe(ER_ENTITY_COLUMN_GRIP_WIDTH + ER_ENTITY_COLUMN_GRIP_GAP);
	});

	it("offers every midpoint on an entity of no columns, the same answer each time", () => {
		const anchors = anchorsOf([]);
		expect(anchors).toEqual({});
		expect(anchorsOf([])).toBe(anchors);
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
