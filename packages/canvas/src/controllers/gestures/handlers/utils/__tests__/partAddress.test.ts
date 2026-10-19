import { describe, expect, it } from "vitest";

import {
	formatPartAddress,
	parsePartAddress,
	readTextSlotPart,
	textSlotPart,
} from "../partAddress";

describe("formatPartAddress", () => {
	it("joins the kind and the id with the separator", () => {
		expect(formatPartAddress("textSlot", "name")).toBe("textSlot:name");
		expect(formatPartAddress("vertex", "0")).toBe("vertex:0");
	});
});

describe("parsePartAddress", () => {
	it("splits a well-formed address", () => {
		expect(parsePartAddress("textSlot:name")).toEqual({
			kind: "textSlot",
			partId: "name",
		});
	});

	it("splits at the first separator, so an id may hold one of its own", () => {
		expect(parsePartAddress("cell:2:1")).toEqual({
			kind: "cell",
			partId: "2:1",
		});
	});

	it("answers null for a part outside the grammar", () => {
		// No separator at all: the slot ids every plugin wrote before the address.
		expect(parsePartAddress("attributes")).toBeNull();
		expect(parsePartAddress(undefined)).toBeNull();
		// An empty kind names no namespace, an empty id no part.
		expect(parsePartAddress(":name")).toBeNull();
		expect(parsePartAddress("textSlot:")).toBeNull();
		expect(parsePartAddress(":")).toBeNull();
		expect(parsePartAddress("")).toBeNull();
	});
});

describe("readTextSlotPart", () => {
	it("reads the slot id off a text slot's address", () => {
		expect(readTextSlotPart(textSlotPart("rows"))).toBe("rows");
	});

	it("names no slot for a press on the body", () => {
		expect(readTextSlotPart(undefined)).toBeUndefined();
	});

	it("names no slot for an address of another kind", () => {
		expect(readTextSlotPart("vertex:0")).toBeUndefined();
	});

	it("names no slot for a bare slot id, the way the plugins spelled it before the address", () => {
		expect(readTextSlotPart("rows")).toBeUndefined();
	});
});
