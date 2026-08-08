import { describe, expect, it } from "vitest";

import {
	hasTextDecorationToken,
	toggleTextDecorationToken,
} from "../toggleTextDecorationToken";

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

describe("toggleTextDecorationToken", () => {
	it("turns a line on from every undecorated form", () => {
		expect(toggleTextDecorationToken(undefined, "underline")).toBe("underline");
		expect(toggleTextDecorationToken("none", "underline")).toBe("underline");
		expect(toggleTextDecorationToken("", "line-through")).toBe("line-through");
	});

	it("returns none once the last line is turned off", () => {
		expect(toggleTextDecorationToken("underline", "underline")).toBe("none");
		expect(toggleTextDecorationToken("line-through", "line-through")).toBe(
			"none",
		);
	});

	it("leaves the other line alone", () => {
		expect(toggleTextDecorationToken("line-through", "underline")).toBe(
			"underline line-through",
		);
		expect(
			toggleTextDecorationToken("underline line-through", "line-through"),
		).toBe("underline");
	});

	it("normalizes the order to underline first", () => {
		expect(
			toggleTextDecorationToken("line-through underline", "underline"),
		).toBe("line-through");
		expect(toggleTextDecorationToken("line-through", "underline")).toBe(
			"underline line-through",
		);
	});

	it("drops lines the menu does not write", () => {
		expect(toggleTextDecorationToken("overline underline", "underline")).toBe(
			"none",
		);
	});
});
