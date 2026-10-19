import { describe, expect, it } from "vitest";

import {
	readErEntityTextSlotStyleDefaults,
	resolveErEntityTextSlotStyle,
} from "../erEntityTextSlotStyle";

const ENTITY = {
	text: {
		name: { text: "users" },
		"col:0:key": { text: "PK" },
		"col:0:name": { text: "id" },
		"col:0:type": { text: "bigint" },
		"col:1:key": { text: "FK" },
		"col:1:name": { text: "org_id" },
		"col:1:type": { text: "bigint" },
	},
};

describe("resolveErEntityTextSlotStyle", () => {
	it("falls back to the registered defaults where nothing else is set", () => {
		expect(resolveErEntityTextSlotStyle(ENTITY, "col:1:type")).toEqual({
			textAlign: "left",
			verticalAlign: "top",
			fontColor: "auto",
			fontSize: 14,
			fontWeight: "normal",
		});
	});

	it("lays each role over the registered defaults", () => {
		expect(resolveErEntityTextSlotStyle(ENTITY, "name")).toMatchObject({
			textAlign: "center",
			verticalAlign: "middle",
			fontWeight: "bold",
		});
		expect(resolveErEntityTextSlotStyle(ENTITY, "col:0:key")).toMatchObject({
			verticalAlign: "middle",
			fontWeight: "bold",
			fontSize: 14,
		});
		expect(resolveErEntityTextSlotStyle(ENTITY, "col:1:name").fontWeight).toBe(
			"normal",
		);
	});

	it("draws a PK column's name in the plain weight", () => {
		expect(resolveErEntityTextSlotStyle(ENTITY, "col:0:name").fontWeight).toBe(
			"normal",
		);
	});

	it("lets the slot's own fields win over the role", () => {
		const entity = {
			text: {
				...ENTITY.text,
				"col:0:key": { text: "PK", fontSize: 30, fontWeight: "normal" },
				"col:0:name": { text: "id", fontWeight: "300" },
			},
		};
		expect(resolveErEntityTextSlotStyle(entity, "col:0:key")).toMatchObject({
			fontSize: 30,
			fontWeight: "normal",
		});
		expect(resolveErEntityTextSlotStyle(entity, "col:0:name").fontWeight).toBe(
			"300",
		);
	});

	it("takes a slot's own family and size over the column defaults", () => {
		const entity = {
			text: {
				...ENTITY.text,
				"col:1:type": { text: "int", fontSize: 20, fontFamily: "serif" },
			},
		};
		expect(resolveErEntityTextSlotStyle(entity, "col:1:type")).toMatchObject({
			fontSize: 20,
			fontFamily: "serif",
			fontWeight: "normal",
		});
	});
});

describe("readErEntityTextSlotStyleDefaults", () => {
	it("gives a column's name and type no role, whatever its key says", () => {
		expect(readErEntityTextSlotStyleDefaults("col:0:name")).toBeUndefined();
		expect(readErEntityTextSlotStyleDefaults("col:0:type")).toBeUndefined();
		expect(readErEntityTextSlotStyleDefaults("unknown")).toBeUndefined();
	});

	it("answers each role with one shared constant over the column defaults", () => {
		expect(readErEntityTextSlotStyleDefaults("col:0:key")).toBe(
			readErEntityTextSlotStyleDefaults("col:7:key"),
		);
		expect(readErEntityTextSlotStyleDefaults("name")).toEqual({
			textAlign: "center",
			verticalAlign: "middle",
			fontColor: "auto",
			fontSize: 14,
			fontWeight: "bold",
		});
	});
});
