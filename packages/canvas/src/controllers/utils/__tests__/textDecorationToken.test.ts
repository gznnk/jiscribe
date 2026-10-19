import { describe, expect, it } from "vitest";

import {
	hasTextDecorationToken,
	setTextDecorationToken,
} from "../textDecorationToken";

describe("hasTextDecorationToken", () => {
	it("reads undefined / none / empty as undecorated", () => {
		expect(hasTextDecorationToken(undefined, "underline")).toBe(false);
		expect(hasTextDecorationToken("none", "underline")).toBe(false);
		expect(hasTextDecorationToken("", "underline")).toBe(false);
	});

	it("finds a line whichever side of the value it sits on", () => {
		expect(hasTextDecorationToken("underline line-through", "underline")).toBe(
			true,
		);
		expect(
			hasTextDecorationToken("underline line-through", "line-through"),
		).toBe(true);
	});

	it("does not take underline as a prefix of another line", () => {
		expect(hasTextDecorationToken("line-through", "underline")).toBe(false);
	});
});

describe("setTextDecorationToken", () => {
	it("turns a line on from every undecorated form", () => {
		expect(setTextDecorationToken(undefined, "underline", true)).toBe(
			"underline",
		);
		expect(setTextDecorationToken("none", "underline", true)).toBe("underline");
		expect(setTextDecorationToken("", "line-through", true)).toBe(
			"line-through",
		);
	});

	it("returns none once the last line is turned off", () => {
		expect(setTextDecorationToken("underline", "underline", false)).toBe(
			"none",
		);
		expect(setTextDecorationToken(undefined, "line-through", false)).toBe(
			"none",
		);
	});

	it("leaves the other line alone", () => {
		expect(setTextDecorationToken("line-through", "underline", true)).toBe(
			"underline line-through",
		);
		expect(
			setTextDecorationToken("underline line-through", "line-through", false),
		).toBe("underline");
	});

	it("keeps a line already in the asked state, normalized", () => {
		expect(
			setTextDecorationToken("line-through underline", "underline", true),
		).toBe("underline line-through");
		expect(setTextDecorationToken("line-through", "underline", false)).toBe(
			"line-through",
		);
	});

	it("drops lines the menu does not write", () => {
		expect(
			setTextDecorationToken("overline underline", "underline", false),
		).toBe("none");
	});
});
