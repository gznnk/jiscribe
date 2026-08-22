import type { RichText, TextSlotContent } from "@jiscribe/doc";
import { isTextRows } from "@jiscribe/doc";
import { describe, it, expect } from "vitest";

import { type RecordDoc } from "../../schema/RecordDoc";
import { validateRecordTextFields } from "../../schema/validateRecordTextFields";
import { recordToDoc, recordToState } from "../RecordMapper";

const makeDoc = (text?: RecordDoc["text"]): RecordDoc =>
	({
		id: "r-1",
		type: "record",
		x: 10,
		y: 20,
		width: 180,
		height: 100,
		...(text === undefined ? {} : { text }),
	}) as unknown as RecordDoc;

/**
 * How the canvas commits an edit into a slot (writeTextSlot): the shape of the
 * content alone decides whether the edited text is written back as rows or as one
 * body, so a band left holding an array would be rewritten as rows.
 */
const commitEdit = (
	content: TextSlotContent,
	value: string,
): TextSlotContent =>
	isTextRows(content) ? (value.split("\n") as RichText[]) : value;

describe("recordToState", () => {
	it("keeps the slot contents as they are", () => {
		const state = recordToState(
			makeDoc({ name: { text: "User" }, attributes: { text: ["id", "name"] } }),
		);
		expect(state.text).toEqual({
			name: { text: "User" },
			attributes: { text: ["id", "name"] },
		});
	});

	it("leaves the typography a slot omits unset, for the draw side to resolve", () => {
		// The per-slot look is registered as the type's draw-time defaults
		// (RECORD_SLOT_STYLE_DEFAULTS_BY_ID), so materializing it here would put
		// six fields per slot into a document that never wrote them.
		const state = recordToState(
			makeDoc({
				stereotype: { text: "<<interface>>" },
				name: { text: "User" },
				attributes: { text: ["id"] },
			}),
		);
		expect(state.text.stereotype).toEqual({ text: "<<interface>>" });
		expect(state.text.name).toEqual({ text: "User" });
		expect(state.text.attributes).toEqual({ text: ["id"] });
	});

	it("keeps each slot's own styling", () => {
		const state = recordToState(
			makeDoc({
				name: { text: "User", fontWeight: "normal" },
				attributes: { text: ["id"], fontSize: 12, textAlign: "center" },
			}),
		);
		expect(state.text).toEqual({
			name: { text: "User", fontWeight: "normal" },
			attributes: { text: ["id"], fontSize: 12, textAlign: "center" },
		});
	});

	it("materializes the title alone when the doc spells out no slot", () => {
		// An absent compartment is an absent compartment, so only the title —
		// which every record has — is filled in.
		expect(recordToState(makeDoc()).text).toEqual({ name: { text: "" } });
	});

	it("keeps a written stereotype and leaves an unwritten one out", () => {
		const state = recordToState(
			makeDoc({ stereotype: { text: "<<enum>>" }, name: { text: "Status" } }),
		);
		expect(state.text.stereotype).toEqual({ text: "<<enum>>" });
		expect(
			recordToState(makeDoc({ name: { text: "Status" } })).text,
		).not.toHaveProperty("stereotype");
	});

	it("keeps a written compartment and leaves an unwritten one out", () => {
		const state = recordToState(
			makeDoc({ name: { text: "User" }, operations: { text: ["save()"] } }),
		);
		expect(Object.keys(state.text)).toEqual(["name", "operations"]);
	});

	it("materializes the title even when the doc writes only a compartment", () => {
		const state = recordToState(
			makeDoc({ attributes: { text: ["id"] } } as RecordDoc["text"]),
		);
		expect(state.text.name).toEqual({ text: "" });
	});

	it("keys the slots in stacking order whatever order the doc wrote them in", () => {
		// Key order is the Tab cycling order, so it has to match the stacking order of the
		// compartments. As a result, the first key of a record with a stereotype is the
		// stereotype.
		const stereotyped = recordToState(
			makeDoc({
				operations: { text: ["save()"] },
				attributes: { text: ["a"] },
				stereotype: { text: "<<abstract>>" },
				name: { text: "User" },
			} as RecordDoc["text"]),
		);
		expect(Object.keys(stereotyped.text)).toEqual([
			"stereotype",
			"name",
			"attributes",
			"operations",
		]);

		const plain = recordToState(
			makeDoc({
				attributes: { text: ["a"] },
				name: { text: "User" },
			} as RecordDoc["text"]),
		);
		expect(Object.keys(plain.text)).toEqual(["name", "attributes"]);
	});

	it("gives every record its own rows array", () => {
		const emptyRows = { name: { text: "" }, attributes: { text: [] } };
		const first = recordToState(makeDoc(emptyRows));
		const second = recordToState(makeDoc(emptyRows));
		expect(first.text.attributes?.text).not.toBe(second.text.attributes?.text);
	});

	it("falls back to an empty slot for a content of the wrong kind", () => {
		const state = recordToState(
			makeDoc({
				name: { text: ["User"] },
				attributes: { text: "id" },
			} as unknown as RecordDoc["text"]),
		);
		expect(state.text).toEqual({
			name: { text: "" },
			attributes: { text: [] },
		});
	});

	it("empties a band the doc wrote as an empty array", () => {
		const state = recordToState(
			makeDoc({ name: { text: [] } } as unknown as RecordDoc["text"]),
		);
		expect(state.text.name.text).toBe("");
	});

	it("collapses a band's unstyled runs to the plain string they hold", () => {
		const state = recordToState(
			makeDoc({
				name: { text: [{ text: "User" }] },
			} as unknown as RecordDoc["text"]),
		);
		expect(state.text.name.text).toBe("User");
	});

	it("keeps a band edited after an empty array one body, not rows", () => {
		// Editing a band left holding `[]` used to write `["NewTitle"]` back, which
		// the record's own validator rejects on the next load — an edit corrupting a
		// document that had loaded clean.
		const state = recordToState(
			makeDoc({ name: { text: [] } } as unknown as RecordDoc["text"]),
		);
		const edited = commitEdit(state.text.name.text, "NewTitle");
		expect(edited).toBe("NewTitle");
		expect(
			validateRecordTextFields({ text: { name: { text: edited } } }, "$"),
		).toEqual([]);
	});

	it("reads an omitted fill as the documented auto default", () => {
		expect(recordToState(makeDoc()).fill).toBe("auto");
	});

	it("keeps an explicit fill", () => {
		const doc = { ...makeDoc(), fill: "#ff0000" } as RecordDoc;
		expect(recordToState(doc).fill).toBe("#ff0000");
	});
});

describe("recordToDoc", () => {
	it("emits the keyed text unconverted", () => {
		const state = recordToState(
			makeDoc({ name: { text: "User" }, attributes: { text: ["id"] } }),
		);
		expect(recordToDoc(state).text).toEqual({
			name: { text: "User" },
			attributes: { text: ["id"] },
		});
	});

	it("keeps the title-only text instead of dropping it", () => {
		const state = recordToState(makeDoc());
		expect(recordToDoc(state).text).toEqual({ name: { text: "" } });
	});

	it("round-trips all four slots without materializing the omitted styling", () => {
		const doc = makeDoc({
			stereotype: { text: "<<interface>>" },
			name: { text: "User", fontWeight: "normal" },
			attributes: { text: ["id: string", "name: string"], fontSize: 12 },
			operations: { text: ["save()"] },
		});
		const roundTripped = recordToDoc(recordToState(doc));
		expect(roundTripped).toMatchObject({
			id: "r-1",
			type: "record",
			x: 10,
			y: 20,
			width: 180,
			height: 100,
		});
		expect(roundTripped.text).toEqual(doc.text);
	});

	it("round-trips a two-compartment box without inventing the third", () => {
		const doc = makeDoc({
			name: { text: "UserDto" },
			attributes: { text: ["id: string"] },
		});
		const roundTripped = recordToDoc(recordToState(doc));
		expect(Object.keys(roundTripped.text ?? {})).toEqual([
			"name",
			"attributes",
		]);
	});
});
