import { createCanvasRegistries } from "@jiscribe/canvas";
import type { ObjectPartSelection } from "@jiscribe/canvas";
import {
	resolveTextSlotIds,
	TEXT_STYLE_INTENT_KINDS,
} from "@jiscribe/canvas-sdk";
import type { ICanvasRegistries, StyleContext } from "@jiscribe/canvas-sdk";
import { describe, expect, it } from "vitest";

import { erPlugin } from "../../plugin";
import { calcErEntityTextSlotRegions } from "../../presentation/calcErEntityTextSlotRegions";
import type { ErEntityDoc } from "../../schema/ErEntityDoc";
import { erEntityToState } from "../../state/ErEntityMapper";
import type { ErEntityState } from "../../state/ErEntityState";
import { parseErEntityLanePartId } from "../erEntityLaneIds";
import {
	ER_ENTITY_LANE_PART_DEFINITION,
	ER_ENTITY_LANE_PART_KIND,
} from "../erEntityLanePartKind";

const makeState = (columns: ErEntityDoc["columns"]): ErEntityState =>
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

const ENTITY = makeState([
	{ key: "PK", name: "id", type: "bigint" },
	{ name: "email", type: "text" },
	{ key: "FK", name: "org_id", type: "bigint" },
]);

const NO_COLUMN_ENTITY = makeState([]);

/** A pick of one range of lanes, from `anchorId` to `focusId`. */
const lanePick = (
	anchorId: string,
	focusId: string = anchorId,
): ObjectPartSelection => ({
	kind: ER_ENTITY_LANE_PART_KIND,
	ranges: [{ anchorId, focusId }],
});

const registries = createCanvasRegistries({
	plugins: [erPlugin],
}) as unknown as ICanvasRegistries;

const ctx: StyleContext = {
	selected: true,
	shapeStyleDefaults: registries.objectShapeStyleDefaults,
	textStyleDefaults: registries.objectTextStyleDefaults,
	objectPartKind: registries.objectPartKind,
	textEditRange: null,
};

describe("erEntityLane part ids", () => {
	it("reads the three lane names and refuses anything else", () => {
		expect(parseErEntityLanePartId("key")).toBe("key");
		expect(parseErEntityLanePartId("name")).toBe("name");
		expect(parseErEntityLanePartId("type")).toBe("type");
		expect(parseErEntityLanePartId("col:0:name")).toBeNull();
		expect(parseErEntityLanePartId("toString")).toBeNull();
		expect(parseErEntityLanePartId(undefined)).toBeNull();
	});
});

describe("ER_ENTITY_LANE_PART_DEFINITION", () => {
	it("is registered on the entity", () => {
		expect(
			registries.objectPartKind.get("erEntity", ER_ENTITY_LANE_PART_KIND),
		).toBe(ER_ENTITY_LANE_PART_DEFINITION);
	});

	it("has and lists the three lanes left to right while the entity has a row", () => {
		expect(ER_ENTITY_LANE_PART_DEFINITION.list?.(ENTITY)).toEqual([
			"key",
			"name",
			"type",
		]);
		expect(ER_ENTITY_LANE_PART_DEFINITION.has(ENTITY, "type")).toBe(true);
		expect(ER_ENTITY_LANE_PART_DEFINITION.has(ENTITY, "col:0")).toBe(false);
		expect(ER_ENTITY_LANE_PART_DEFINITION.multiPick).toBe(true);
	});

	it("has no lane on an entity of no columns", () => {
		expect(ER_ENTITY_LANE_PART_DEFINITION.list?.(NO_COLUMN_ENTITY)).toEqual([]);
		expect(ER_ENTITY_LANE_PART_DEFINITION.has(NO_COLUMN_ENTITY, "name")).toBe(
			false,
		);
		expect(
			ER_ENTITY_LANE_PART_DEFINITION.region?.(NO_COLUMN_ENTITY, "name"),
		).toBeNull();
	});

	it("outlines a lane over its slots from the first row to the last, the title left out", () => {
		const regions = calcErEntityTextSlotRegions(ENTITY);
		for (const lane of ["key", "name", "type"] as const) {
			const first = regions[`col:0:${lane}`];
			const last = regions[`col:2:${lane}`];
			expect(ER_ENTITY_LANE_PART_DEFINITION.region?.(ENTITY, lane)).toEqual({
				x: first.x,
				y: first.y,
				width: first.width,
				height: last.y + last.height - first.y,
			});
		}
	});

	it("reaches the picked lanes' slot in every row, row by row", () => {
		expect(
			ER_ENTITY_LANE_PART_DEFINITION.textSlotIds?.(ENTITY, ["type"]),
		).toEqual(["col:0:type", "col:1:type", "col:2:type"]);
		expect(resolveTextSlotIds(ENTITY, lanePick("type", "name"), ctx)).toEqual([
			"col:0:name",
			"col:0:type",
			"col:1:name",
			"col:1:type",
			"col:2:name",
			"col:2:type",
		]);
	});

	it("writes a lane pick's bold into that lane's slots and no others, through the core entry", () => {
		const written = registries.objectStyle
			.get("erEntity")
			?.fontWeight?.apply(
				ENTITY,
				lanePick("type"),
				"bold",
				ctx,
			) as ErEntityState;

		expect(written.text["col:0:type"].fontWeight).toBe("bold");
		expect(written.text["col:2:type"].fontWeight).toBe("bold");
		expect(written.text["col:0:name"].fontWeight).toBeUndefined();
		expect(written.text.name.fontWeight).toBeUndefined();
	});

	it("receives what a slot pick does", () => {
		expect(
			[...(ER_ENTITY_LANE_PART_DEFINITION.styleIntentKinds ?? [])].sort(),
		).toEqual([...TEXT_STYLE_INTENT_KINDS].sort());
	});

	it("empties the picked lane on delete, keeping its slots and every other text", () => {
		const cleared = ER_ENTITY_LANE_PART_DEFINITION.delete?.(ENTITY, [
			"type",
		])?.object;
		expect(cleared?.text["col:0:type"].text).toBe("");
		expect(cleared?.text["col:2:type"].text).toBe("");
		expect(cleared?.text["col:0:name"].text).toBe("id");
		expect(cleared?.text["col:0:key"].text).toBe("PK");
		expect(cleared?.text.name.text).toBe("users");
	});

	it("refuses to delete a lane whose slots are empty already", () => {
		const cleared = ER_ENTITY_LANE_PART_DEFINITION.delete?.(ENTITY, [
			"key",
		])?.object;
		expect(cleared).toBeDefined();
		expect(
			ER_ENTITY_LANE_PART_DEFINITION.delete?.(cleared!, ["key"]),
		).toBeNull();
	});
});
