import { describe, expect, it } from "vitest";

import type { ErEntityDoc } from "../../schema/ErEntityDoc";
import { clearErEntityTextSlots } from "../clearErEntityTextSlots";
import { erEntityToState } from "../ErEntityMapper";

/** An entity whose second column has a long name, its key gutter left automatic. */
const makeState = () =>
	erEntityToState({
		id: "e-1",
		type: "erEntity",
		x: 0,
		y: 0,
		nameWidth: 96,
		typeWidth: 100,
		name: "users",
		columns: [
			{ key: "PK", name: "id", type: "bigint" },
			{
				name: { text: "a_long_column_name", fontWeight: "bold" },
				type: "text",
			},
		],
	} as ErEntityDoc);

describe("clearErEntityTextSlots", () => {
	it("empties every named slot and keeps the rest", () => {
		const state = makeState();
		const cleared = clearErEntityTextSlots(state, [
			"col:0:key",
			"col:0:type",
			"name",
		]);

		expect(cleared?.text["col:0:key"]?.text).toBe("");
		expect(cleared?.text["col:0:type"]?.text).toBe("");
		expect(cleared?.text.name?.text).toBe("");
		expect(cleared?.text["col:0:name"]?.text).toBe("id");
		expect(cleared?.text["col:1:type"]?.text).toBe("text");
	});

	it("keeps a slot's own typography, taking the text alone", () => {
		const state = makeState();
		const slotBefore = state.text["col:1:name"];
		const cleared = clearErEntityTextSlots(state, ["col:1:name"]);

		expect(cleared?.text["col:1:name"]).toEqual({ ...slotBefore, text: "" });
	});

	it("narrows a cleared long name's column back to its stated width, the stated widths kept", () => {
		const state = makeState();
		const cleared = clearErEntityTextSlots(state, ["col:1:name"]);

		// "a_long_column_name" was drawn 164 wide (18 × 8.4, rounded up, plus 12).
		expect(cleared?.width).toBe(state.width - (164 - 96));
		expect(cleared?.nameWidth).toBe(96);
		expect(cleared?.typeWidth).toBe(state.typeWidth);
	});

	it("narrows an automatic key gutter with its keys, as editing one empty does, the other columns kept", () => {
		const state = makeState();
		const cleared = clearErEntityTextSlots(state, ["col:0:key"]);

		// "PK" was drawn 29 wide; no key leaves the 24 minimum.
		expect(cleared?.width).toBe(state.width - (29 - 24));
		expect(cleared).not.toHaveProperty("keyWidth");
		expect(cleared?.nameWidth).toBe(state.nameWidth);
		expect(cleared?.typeWidth).toBe(state.typeWidth);
	});

	it("refuses with null when every named slot is already empty or missing", () => {
		const state = makeState();

		expect(clearErEntityTextSlots(state, ["col:1:key", "col:9:name"])).toBe(
			null,
		);
	});

	it("leaves the state it is given untouched", () => {
		const state = makeState();
		const textBefore = state.text;
		clearErEntityTextSlots(state, ["col:0:name"]);

		expect(state.text).toBe(textBefore);
		expect(state.text["col:0:name"]?.text).toBe("id");
	});
});
