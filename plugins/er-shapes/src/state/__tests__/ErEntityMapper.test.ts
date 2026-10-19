import { describe, expect, it } from "vitest";

import {
	ER_ENTITY_DEFAULT_NAME_WIDTH,
	ER_ENTITY_DEFAULT_TYPE_WIDTH,
} from "../../schema/ErEntityDoc";
import type { ErEntityDoc } from "../../schema/ErEntityDoc";
import { erEntityToDoc, erEntityToState } from "../ErEntityMapper";

/** A document stating no slot width. */
const makeBareDoc = (fields: Partial<ErEntityDoc> = {}): ErEntityDoc =>
	({
		id: "users",
		type: "erEntity",
		x: 100,
		y: 80,
		name: "users",
		columns: [{ key: "PK", name: "id", type: "bigint" }, { name: "email" }],
		...fields,
	}) as ErEntityDoc;

/** 220 wide with the 29 px key gutter "PK" sets. */
const makeDoc = (fields: Partial<ErEntityDoc> = {}): ErEntityDoc =>
	makeBareDoc({ nameWidth: 91, typeWidth: 100, ...fields });

describe("erEntityToState", () => {
	it("keys the title first, then all three slots of every column", () => {
		const state = erEntityToState(makeDoc());
		expect(Object.keys(state.text)).toEqual([
			"name",
			"col:0:key",
			"col:0:name",
			"col:0:type",
			"col:1:key",
			"col:1:name",
			"col:1:type",
		]);
	});

	it("gives an omitted key or type an empty slot", () => {
		const state = erEntityToState(makeDoc());
		expect(state.text["col:1:key"].text).toBe("");
		expect(state.text["col:1:type"].text).toBe("");
	});

	it("writes no role typography onto the slots, which hold what the document states alone", () => {
		const state = erEntityToState(makeDoc());
		expect(state.text["col:0:key"]).toEqual({ text: "PK" });
		expect(state.text["col:0:name"]).toEqual({ text: "id" });
		expect(state.text.name).toEqual({ text: "users" });
	});

	it("carries a text's own typography onto its slot", () => {
		const state = erEntityToState(
			makeDoc({
				name: { text: "users", fontColor: "#ff0000" },
				columns: [{ name: { text: "id", fontWeight: "bold" }, type: "int" }],
			}),
		);
		expect(state.text.name).toEqual({ text: "users", fontColor: "#ff0000" });
		expect(state.text["col:0:name"]).toEqual({
			text: "id",
			fontWeight: "bold",
		});
	});

	it("carries no typography written at the root, which the validator refuses", () => {
		const state = erEntityToState({
			...makeDoc(),
			fontSize: 18,
			fontColor: "#333333",
		} as ErEntityDoc);
		expect(state).not.toHaveProperty("fontSize");
		expect(state).not.toHaveProperty("fontColor");
		expect(state.text.name).toEqual({ text: "users" });
	});

	it("measures the box from the columns, keeping the drawn corner", () => {
		const state = erEntityToState(makeDoc());
		expect(state.width).toBe(220);
		expect(state.height).toBe(28 + 25 + 25);
		expect(state.cx).toBe(100 + 110);
		expect(state.cy).toBe(80 + 39);
		expect(state.derivedWidth).toBe(220);
		// Key 29 plus the name floor 54 ("email") and the type floor 63 ("bigint").
		expect(state.minWidth).toBe(29 + 54 + 63);
	});

	it("fills in the name and type widths a document leaves out", () => {
		const state = erEntityToState(makeBareDoc());
		expect(state.nameWidth).toBe(ER_ENTITY_DEFAULT_NAME_WIDTH);
		expect(state.typeWidth).toBe(ER_ENTITY_DEFAULT_TYPE_WIDTH);
		expect(state.width).toBe(
			29 + ER_ENTITY_DEFAULT_NAME_WIDTH + ER_ENTITY_DEFAULT_TYPE_WIDTH,
		);
	});

	it("measures a slot stated narrower than its texts at its floor, keeping the stated width", () => {
		const doc = makeDoc({ nameWidth: 30, typeWidth: 60 });
		const state = erEntityToState(doc);
		expect(state.nameWidth).toBe(30);
		expect(state.typeWidth).toBe(60);
		expect(state.width).toBe(29 + 54 + 63);
		expect(state.derivedWidth).toBe(state.width);
		// Saved as stated: the drawing re-fits from the texts on the next load.
		expect(erEntityToDoc(state)).toEqual(doc);
	});
});

describe("erEntityToDoc", () => {
	it("round-trips a document, omitted key and type staying omitted", () => {
		const doc = makeDoc({
			fill: "#ffffff",
			name: {
				text: "users",
				fontSize: 16,
				fontFamily: '"Source Code Pro", "Noto Sans JP", monospace',
			},
		});
		expect(erEntityToDoc(erEntityToState(doc))).toEqual(doc);
	});

	it("writes no typography for a document that wrote none", () => {
		const written = erEntityToDoc(erEntityToState(makeDoc()));
		expect(written).not.toHaveProperty("fontSize");
		expect(written).not.toHaveProperty("fontColor");
		expect(written).not.toHaveProperty("fontFamily");
		expect(written).not.toHaveProperty("height");
	});

	it("keeps the columns in declared order however they are drawn", () => {
		const doc = makeDoc({
			columns: [
				{ name: "email", type: "text" },
				{ key: "PK", name: "id" },
			],
		});
		expect(erEntityToDoc(erEntityToState(doc)).columns).toEqual(doc.columns);
	});

	it("writes a styled text back as the slot object and an unstyled one as its text", () => {
		const doc = makeDoc({
			name: { text: "users", fontSize: 18 },
			columns: [
				{
					key: { text: "PK", fontColor: "#ff0000" },
					name: "id",
					type: { text: "bigint", fontStyle: "italic" },
				},
				{ name: "email" },
			],
		});
		expect(erEntityToDoc(erEntityToState(doc))).toEqual(doc);
	});

	it("keeps an empty key or type that states typography", () => {
		const doc = makeDoc({
			columns: [{ key: { text: "", fontWeight: "normal" }, name: "id" }],
		});
		expect(erEntityToDoc(erEntityToState(doc)).columns).toEqual(doc.columns);
	});

	it("writes a slot whose style was cleared back in the short form", () => {
		const state = erEntityToState(makeDoc());
		const written = erEntityToDoc({
			...state,
			text: { ...state.text, "col:1:name": { text: "email" } },
		});
		expect(written.columns[1]).toEqual({ name: "email" });
	});

	it("keeps styled runs as written", () => {
		const doc = makeDoc({
			columns: [
				{
					name: [{ text: "id", fontStyle: "italic" }, { text: "_x" }],
					type: "int",
				},
			],
		});
		expect(erEntityToDoc(erEntityToState(doc)).columns).toEqual(doc.columns);
	});

	it("carries a stated key gutter width both ways, and writes none that was not stated", () => {
		const doc = makeDoc({ keyWidth: 40 });
		const state = erEntityToState(doc);
		expect(state.keyWidth).toBe(40);
		expect(state.derivedWidth).toBe(state.width);
		expect(erEntityToDoc(state)).toEqual(doc);

		const derived = erEntityToState(makeDoc());
		expect(derived).not.toHaveProperty("keyWidth");
		expect(erEntityToDoc(derived)).not.toHaveProperty("keyWidth");
	});

	it("always writes the name and type widths, and never the box", () => {
		const written = erEntityToDoc(erEntityToState(makeBareDoc()));
		expect(written.nameWidth).toBe(ER_ENTITY_DEFAULT_NAME_WIDTH);
		expect(written.typeWidth).toBe(ER_ENTITY_DEFAULT_TYPE_WIDTH);
		expect(written).not.toHaveProperty("width");
		expect(written).not.toHaveProperty("derivedWidth");
		expect(written).not.toHaveProperty("minWidth");
	});
});
