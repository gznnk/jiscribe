// record_set_compartments called the way a host calls it short of the tool set:
// the arguments parsed by the declared schema, and every written result stored
// through docOps.replaceObject, so it has also passed the record's validateDoc and
// the unknown-key check. The whole host path (createCanvasToolSet + applyCanvasOp)
// is exercised by the MCP server's tests; @jiscribe/ai-tools develops against this
// package, so depending on it here would close a workspace cycle.
//
// Heights are measured with the estimate vitest.setup.ts offers; a row's line box
// is fontSize × line-height whatever the measurer, so the expected heights below
// are spelled out from the record's own constants.

import {
	createDocOps,
	type CanvasDoc,
	type RichText,
	type TextSlot,
} from "@jiscribe/doc";
import {
	calcAffineTransformedPoint,
	degreesToRadians,
} from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { umlDocPlugin } from "../../doc";
import {
	calcRecordListHeight,
	RECORD_BAND_HEIGHT,
	RECORD_DOC_DEFAULTS,
	RECORD_TEXT_SLOT_STYLE_DEFAULTS_BY_ID,
} from "../../schema/RecordDoc";
import type { RecordDoc } from "../../schema/RecordDoc";
import { umlAiToolPlugin } from "../../tools";
import { recordSetCompartmentsTool } from "../recordSetCompartmentsTool";

const docOps = createDocOps({ plugins: [umlDocPlugin] });

/** A record as add_object writes one: a title over three attribute rows, fitted. */
const makeRecordDoc = (overrides: Partial<RecordDoc> = {}): RecordDoc =>
	({
		...structuredClone(RECORD_DOC_DEFAULTS),
		id: "r1",
		x: 40,
		y: 60,
		text: {
			name: { text: "User", ...RECORD_TEXT_SLOT_STYLE_DEFAULTS_BY_ID.name },
			attributes: {
				text: ["- id: string", "- name: string", "- email: string"],
				...RECORD_TEXT_SLOT_STYLE_DEFAULTS_BY_ID.attributes,
			},
		},
		...overrides,
	}) as RecordDoc;

/** The fitted height of a title over three attribute rows. */
const TITLE_AND_THREE_ROWS_HEIGHT =
	RECORD_BAND_HEIGHT + calcRecordListHeight(3);

/**
 * Runs the tool on `record` and stores the result, the way the host does: the
 * arguments through the declared schema, the object through replaceObject.
 */
const callTool = (record: RecordDoc, args: Record<string, unknown>) => {
	const apply = recordSetCompartmentsTool.apply;
	if (apply === undefined) {
		throw new Error("record_set_compartments is declared as a reading tool");
	}
	const parsedArgs = z
		.object(recordSetCompartmentsTool.inputSchema)
		.strict()
		.parse(args);
	const change = apply(record, parsedArgs);
	const doc = { version: 1, root: [record] } as CanvasDoc;
	docOps.replaceObject(doc, record.id, change.doc);
	return {
		record: docOps.getObject(doc, record.id) as Readonly<RecordDoc>,
		text: change.text,
	};
};

/** The slot ids a record's text holds, in the order they are stored. */
const readSlotIds = (record: RecordDoc): string[] =>
	Object.keys(record.text ?? {});

describe("the UML shapes' tool bundle", () => {
	it("offers record_set_compartments for the record type", () => {
		expect(umlAiToolPlugin.tools.map((tool) => tool.name)).toEqual([
			"record_set_compartments",
		]);
		expect(recordSetCompartmentsTool.objectType).toBe("record");
	});
});

describe("record_set_compartments", () => {
	it("adds an operations compartment with the record's defaults and grows the box to it", () => {
		const { record, text } = callTool(makeRecordDoc(), {
			operations: ["+ save(): void", "+ delete(): void"],
		});

		const expectedHeight =
			TITLE_AND_THREE_ROWS_HEIGHT + calcRecordListHeight(2);
		expect(record.text?.operations).toEqual({
			text: ["+ save(): void", "+ delete(): void"],
			...RECORD_TEXT_SLOT_STYLE_DEFAULTS_BY_ID.operations,
		});
		expect(record.height).toBe(expectedHeight);
		expect(record.y).toBe(60);
		expect(record.x).toBe(40);
		expect(text).toBe(
			`record "r1": added operations; now has name, attributes (3 rows), operations (2 rows); height ${TITLE_AND_THREE_ROWS_HEIGHT} → ${expectedHeight}`,
		);
	});

	it("adds a stereotype band above the name and stores the slots in stacking order", () => {
		const { record, text } = callTool(makeRecordDoc(), {
			stereotype: "<<entity>>",
		});

		expect(readSlotIds(record)).toEqual(["stereotype", "name", "attributes"]);
		expect(record.text?.stereotype).toEqual({
			text: "<<entity>>",
			...RECORD_TEXT_SLOT_STYLE_DEFAULTS_BY_ID.stereotype,
		});
		expect(record.height).toBe(
			TITLE_AND_THREE_ROWS_HEIGHT + RECORD_BAND_HEIGHT,
		);
		expect(text).toContain("added stereotype");
	});

	it("keeps an empty stereotype band for an empty string", () => {
		const { record } = callTool(makeRecordDoc(), { stereotype: "" });

		expect(record.text?.stereotype?.text).toBe("");
		expect(record.height).toBe(
			TITLE_AND_THREE_ROWS_HEIGHT + RECORD_BAND_HEIGHT,
		);
	});

	it("removes a compartment for null and shrinks the box to what is left", () => {
		const { record, text } = callTool(makeRecordDoc(), { attributes: null });

		expect(readSlotIds(record)).toEqual(["name"]);
		expect(record.height).toBe(RECORD_BAND_HEIGHT);
		expect(text).toBe(
			`record "r1": removed attributes; now has name; height ${TITLE_AND_THREE_ROWS_HEIGHT} → ${RECORD_BAND_HEIGHT}`,
		);
	});

	it("keeps an empty compartment drawn for [] with one row's worth of height", () => {
		const { record, text } = callTool(makeRecordDoc(), { attributes: [] });

		expect(record.text?.attributes?.text).toEqual([]);
		expect(record.height).toBe(RECORD_BAND_HEIGHT + calcRecordListHeight(0));
		expect(text).toContain("now has name, attributes (empty);");
	});

	it("replaces the rows of an existing compartment and keeps its typography", () => {
		const styledAttributes: TextSlot<RichText[]> = {
			text: ["- id: string"],
			...RECORD_TEXT_SLOT_STYLE_DEFAULTS_BY_ID.attributes,
			fontSize: 20,
			fontColor: "#336699",
			fontStyle: "italic",
		};
		const { record, text } = callTool(
			makeRecordDoc({
				text: {
					...makeRecordDoc().text,
					name: { text: "User" },
					attributes: styledAttributes,
				},
				height: RECORD_BAND_HEIGHT + calcRecordListHeight(1, 20),
			}),
			{ attributes: ["- id: string", "- age: number"] },
		);

		expect(record.text?.attributes).toEqual({
			...styledAttributes,
			text: ["- id: string", "- age: number"],
		});
		// Measured at the slot's own size, not the default one
		expect(record.height).toBe(
			RECORD_BAND_HEIGHT + calcRecordListHeight(2, 20),
		);
		expect(text).toContain("replaced attributes");
	});

	it("leaves an omitted compartment as it is", () => {
		const before = makeRecordDoc();
		const { record } = callTool(before, { operations: ["+ run()"] });

		expect(record.text?.attributes).toEqual(before.text?.attributes);
		expect(record.text?.name).toEqual(before.text?.name);
	});

	it("refits a box taller than its content with no compartment given", () => {
		const { record, text } = callTool(makeRecordDoc({ height: 300 }), {});

		expect(record.height).toBe(TITLE_AND_THREE_ROWS_HEIGHT);
		expect(record.y).toBe(60);
		expect(text).toBe(
			`record "r1" now has name, attributes (3 rows); height 300 → ${TITLE_AND_THREE_ROWS_HEIGHT}`,
		);
	});

	it("reports an unchanged height when the new content needs the same room", () => {
		const { text } = callTool(makeRecordDoc(), {
			attributes: ["- a", "- b", "- c"],
		});

		expect(text).toBe(
			`record "r1": replaced attributes; now has name, attributes (3 rows); height ${TITLE_AND_THREE_ROWS_HEIGHT} (unchanged)`,
		);
	});

	it("refuses a call that would change nothing", () => {
		const record = makeRecordDoc();

		expect(() =>
			callTool(record, {
				attributes: ["- id: string", "- name: string", "- email: string"],
				stereotype: null,
			}),
		).toThrow(
			`record "r1" already has name, attributes (3 rows) and height ${TITLE_AND_THREE_ROWS_HEIGHT}, which fits them; nothing was changed`,
		);
	});

	it("refuses a row holding a newline, naming the entry", () => {
		expect(() =>
			callTool(makeRecordDoc(), { operations: ["+ a()", "+ b()\n+ c()"] }),
		).toThrow(
			"operations[1] contains a newline: give each row as its own array entry",
		);
	});

	it("does not take the name slot", () => {
		expect(() => callTool(makeRecordDoc(), { name: "Account" })).toThrow();
	});

	it("keeps the drawn top edge of a turned record where it was", () => {
		const before = makeRecordDoc({ rotation: 90 });
		const { record } = callTool(before, { operations: ["+ run()"] });

		/** Where the middle of the record's local top edge is drawn. */
		const drawnTopEdgeCenter = (target: RecordDoc) =>
			calcAffineTransformedPoint(
				0,
				-target.height / 2,
				1,
				1,
				degreesToRadians(target.rotation ?? 0),
				target.x + target.width / 2,
				target.y + target.height / 2,
			);
		expect(record.height).toBe(
			TITLE_AND_THREE_ROWS_HEIGHT + calcRecordListHeight(1),
		);
		const beforeEdge = drawnTopEdgeCenter(before);
		const afterEdge = drawnTopEdgeCenter(record);
		expect(afterEdge.x).toBeCloseTo(beforeEdge.x, 3);
		expect(afterEdge.y).toBeCloseTo(beforeEdge.y, 3);
	});

	it("keeps the drawn top edge of a vertically flipped record, growing it upwards", () => {
		const before = makeRecordDoc({ flipY: true });
		const { record } = callTool(before, { operations: ["+ run()"] });

		// Flipped, the local top edge is the drawn bottom one
		expect(record.y + record.height).toBe(before.y + before.height);
	});
});
