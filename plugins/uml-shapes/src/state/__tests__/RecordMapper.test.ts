import { describe, it, expect } from "vitest";

import {
	RECORD_SLOT_STYLE_DEFAULTS_BY_ID,
	type RecordDoc,
} from "../../schema/RecordDoc";
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

describe("recordToState", () => {
	it("keeps the slot contents, filling omitted styling with the record defaults", () => {
		const state = recordToState(
			makeDoc({ name: { text: "User" }, attributes: { text: ["id", "name"] } }),
		);
		expect(state.text).toEqual({
			name: { ...RECORD_SLOT_STYLE_DEFAULTS_BY_ID.name, text: "User" },
			attributes: {
				...RECORD_SLOT_STYLE_DEFAULTS_BY_ID.attributes,
				text: ["id", "name"],
			},
		});
	});

	it("styles a slot the doc left unstyled the way that slot is drawn", () => {
		// AI が書いた `{"name":{"text":"User"}}` が、ツールバーから置いた record と
		// 同じ見た目になること。
		const state = recordToState(
			makeDoc({
				stereotype: { text: "<<interface>>" },
				name: { text: "User" },
				attributes: { text: ["id"] },
			}),
		);
		expect(state.text.stereotype).toMatchObject({
			textAlign: "center",
			verticalAlign: "middle",
			fontWeight: "normal",
		});
		expect(state.text.name).toMatchObject({
			textAlign: "center",
			verticalAlign: "middle",
			fontWeight: "bold",
		});
		expect(state.text.attributes).toMatchObject({
			textAlign: "left",
			verticalAlign: "top",
			fontWeight: "normal",
		});
	});

	it("lets each slot's own styling win over the defaults", () => {
		const state = recordToState(
			makeDoc({
				name: { text: "User", fontWeight: "normal" },
				attributes: { text: ["id"], fontSize: 12, textAlign: "center" },
			}),
		);
		expect(state.text).toEqual({
			name: {
				...RECORD_SLOT_STYLE_DEFAULTS_BY_ID.name,
				text: "User",
				fontWeight: "normal",
			},
			attributes: {
				...RECORD_SLOT_STYLE_DEFAULTS_BY_ID.attributes,
				text: ["id"],
				fontSize: 12,
				textAlign: "center",
			},
		});
	});

	it("materializes the title alone when the doc spells out no slot", () => {
		// An absent compartment is an absent compartment, so only the title —
		// which every record has — is filled in.
		expect(recordToState(makeDoc()).text).toEqual({
			name: { ...RECORD_SLOT_STYLE_DEFAULTS_BY_ID.name, text: "" },
		});
	});

	it("keeps a written stereotype and leaves an unwritten one out", () => {
		const state = recordToState(
			makeDoc({ stereotype: { text: "<<enum>>" }, name: { text: "Status" } }),
		);
		expect(state.text.stereotype).toEqual({
			...RECORD_SLOT_STYLE_DEFAULTS_BY_ID.stereotype,
			text: "<<enum>>",
		});
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
		expect(state.text.name).toEqual({
			...RECORD_SLOT_STYLE_DEFAULTS_BY_ID.name,
			text: "",
		});
	});

	it("keys the slots in stacking order whatever order the doc wrote them in", () => {
		// キー順は Tab の巡回順なので、コンパートメントの重なり順に一致させる。
		// その結果 stereotype を持つ record では先頭キーが stereotype になる。
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
			name: { ...RECORD_SLOT_STYLE_DEFAULTS_BY_ID.name, text: "" },
			attributes: { ...RECORD_SLOT_STYLE_DEFAULTS_BY_ID.attributes, text: [] },
		});
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
	it("emits the keyed text unconverted, the materialized defaults included", () => {
		const state = recordToState(
			makeDoc({ name: { text: "User" }, attributes: { text: ["id"] } }),
		);
		expect(recordToDoc(state).text).toEqual({
			name: { ...RECORD_SLOT_STYLE_DEFAULTS_BY_ID.name, text: "User" },
			attributes: {
				...RECORD_SLOT_STYLE_DEFAULTS_BY_ID.attributes,
				text: ["id"],
			},
		});
	});

	it("keeps the title-only text instead of dropping it", () => {
		const state = recordToState(makeDoc());
		expect(recordToDoc(state).text).toEqual({
			name: { ...RECORD_SLOT_STYLE_DEFAULTS_BY_ID.name, text: "" },
		});
	});

	it("round-trips all four slots, materializing the omitted defaults", () => {
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
		expect(roundTripped.text).toEqual({
			stereotype: {
				...RECORD_SLOT_STYLE_DEFAULTS_BY_ID.stereotype,
				text: "<<interface>>",
			},
			name: {
				...RECORD_SLOT_STYLE_DEFAULTS_BY_ID.name,
				text: "User",
				fontWeight: "normal",
			},
			attributes: {
				...RECORD_SLOT_STYLE_DEFAULTS_BY_ID.attributes,
				text: ["id: string", "name: string"],
				fontSize: 12,
			},
			operations: {
				...RECORD_SLOT_STYLE_DEFAULTS_BY_ID.operations,
				text: ["save()"],
			},
		});
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
