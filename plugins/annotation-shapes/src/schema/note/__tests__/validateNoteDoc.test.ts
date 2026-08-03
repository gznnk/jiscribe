import { describe, expect, it } from "vitest";

import { NOTE_DOC_DEFAULTS } from "../NoteDoc";
import { NoteObjectFactory } from "../NoteObjectFactory";
import { validateNoteDoc } from "../validateNoteDoc";

const baseDoc = { ...NOTE_DOC_DEFAULTS, id: "note-1" } as Record<
	string,
	unknown
>;

describe("validateNoteDoc", () => {
	it("accepts the defaults", () => {
		expect(validateNoteDoc(baseDoc, "root[0]")).toEqual([]);
	});

	it("rejects a box side that is not a number", () => {
		const errors = validateNoteDoc({ ...baseDoc, width: "180" }, "root[0]");
		expect(errors.map((error) => error.path)).toEqual(["root[0].width"]);
	});

	it("rejects an alignment outside the enum", () => {
		const errors = validateNoteDoc(
			{ ...baseDoc, verticalAlign: "center" },
			"root[0]",
		);
		expect(errors.map((error) => error.path)).toEqual([
			"root[0].verticalAlign",
		]);
	});

	/**
	 * The fold is a fixed ratio of the box (NOTE_FOLD_RATIO), not a property, so
	 * there is nothing type-specific to check here. A doc that tries to set one
	 * anyway parses silently — only the published JSON Schema, being
	 * additionalProperties:false, calls it out.
	 */
	it("stays silent about a fold size it does not declare", () => {
		expect(validateNoteDoc({ ...baseDoc, fold: 40 }, "root[0]")).toEqual([]);
	});
});

describe("NoteObjectFactory", () => {
	it("takes the drawn box as it is, with no proportion of its own to keep", () => {
		const doc = NoteObjectFactory.createDocFromBounds?.(20, 40, 200, 150) as {
			type: string;
			x: number;
			y: number;
			width: number;
			height: number;
		} | null;
		expect(doc).toMatchObject({
			type: "note",
			x: 20,
			y: 40,
			width: 180,
			height: 110,
		});
	});

	it("places a clicked note around the point, keeping the prose defaults", () => {
		const doc = NoteObjectFactory.createDoc({ x: 100, y: 100 }) as Record<
			string,
			unknown
		>;
		// 180x110 centered on the click.
		expect(doc.x).toBe(10);
		expect(doc.y).toBe(45);
		expect(doc.textAlign).toBe("left");
		expect(doc.verticalAlign).toBe("top");
	});
});
