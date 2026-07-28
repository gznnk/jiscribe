import { describe, it, expect } from "vitest";

import {
	RECORD_SLOT_STYLE_DEFAULTS,
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
			makeDoc({ name: { text: "User" }, rows: { text: ["id", "name"] } }),
		);
		expect(state.text).toEqual({
			name: { ...RECORD_SLOT_STYLE_DEFAULTS, text: "User" },
			rows: { ...RECORD_SLOT_STYLE_DEFAULTS, text: ["id", "name"] },
		});
	});

	it("lets each slot's own styling win over the defaults", () => {
		const state = recordToState(
			makeDoc({
				name: { text: "User", fontWeight: "bold" },
				rows: { text: ["id"], fontSize: 12, textAlign: "center" },
			}),
		);
		expect(state.text).toEqual({
			name: { ...RECORD_SLOT_STYLE_DEFAULTS, text: "User", fontWeight: "bold" },
			rows: {
				...RECORD_SLOT_STYLE_DEFAULTS,
				text: ["id"],
				fontSize: 12,
				textAlign: "center",
			},
		});
	});

	it("fills in both slots when the doc spells out neither", () => {
		expect(recordToState(makeDoc()).text).toEqual({
			name: { ...RECORD_SLOT_STYLE_DEFAULTS, text: "" },
			rows: { ...RECORD_SLOT_STYLE_DEFAULTS, text: [] },
		});
	});

	it("puts name first even when the doc wrote rows first", () => {
		// 先頭キーが Enter 起動の既定スロットなので、キー順は state 側で固定する。
		const state = recordToState(
			makeDoc({
				rows: { text: ["a"] },
				name: { text: "User" },
			} as RecordDoc["text"]),
		);
		expect(Object.keys(state.text)).toEqual(["name", "rows"]);
	});

	it("gives every record its own rows array", () => {
		const first = recordToState(makeDoc());
		const second = recordToState(makeDoc());
		expect(first.text.rows.text).not.toBe(second.text.rows.text);
	});

	it("falls back to an empty slot for a content of the wrong kind", () => {
		const state = recordToState(
			makeDoc({
				name: { text: ["User"] },
				rows: { text: "id" },
			} as unknown as RecordDoc["text"]),
		);
		expect(state.text).toEqual({
			name: { ...RECORD_SLOT_STYLE_DEFAULTS, text: "" },
			rows: { ...RECORD_SLOT_STYLE_DEFAULTS, text: [] },
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
			makeDoc({ name: { text: "User" }, rows: { text: ["id"] } }),
		);
		expect(recordToDoc(state).text).toEqual({
			name: { ...RECORD_SLOT_STYLE_DEFAULTS, text: "User" },
			rows: { ...RECORD_SLOT_STYLE_DEFAULTS, text: ["id"] },
		});
	});

	it("keeps the empty keyed text instead of dropping it", () => {
		const state = recordToState(makeDoc());
		expect(recordToDoc(state).text).toEqual({
			name: { ...RECORD_SLOT_STYLE_DEFAULTS, text: "" },
			rows: { ...RECORD_SLOT_STYLE_DEFAULTS, text: [] },
		});
	});

	it("round-trips content and explicit styling, materializing the omitted defaults", () => {
		const doc = makeDoc({
			name: { text: "User", fontWeight: "bold" },
			rows: { text: ["id: string", "name: string"], fontSize: 12 },
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
			name: { ...RECORD_SLOT_STYLE_DEFAULTS, text: "User", fontWeight: "bold" },
			rows: {
				...RECORD_SLOT_STYLE_DEFAULTS,
				text: ["id: string", "name: string"],
				fontSize: 12,
			},
		});
	});
});
