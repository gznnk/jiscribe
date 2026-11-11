import { describe, expect, it } from "vitest";

import { createLayoutAxis, createSideAxis } from "../LayoutAxis";

const POINT = { x: 3, y: 7 };
const BOX = { x: 10, y: 20, width: 100, height: 50 };

describe("createSideAxis", () => {
	it.each(["top", "bottom"] as const)("reads x and width on %s", (side) => {
		const axis = createSideAxis(side);
		expect(axis.across(POINT)).toBe(3);
		expect(axis.acrossStart(BOX)).toBe(10);
		expect(axis.acrossExtent(BOX)).toBe(100);
	});

	it.each(["left", "right"] as const)("reads y and height on %s", (side) => {
		const axis = createSideAxis(side);
		expect(axis.across(POINT)).toBe(7);
		expect(axis.acrossStart(BOX)).toBe(20);
		expect(axis.acrossExtent(BOX)).toBe(50);
	});

	it.each([
		["top", "TB"],
		["left", "LR"],
	] as const)(
		"reads %s as a %s layout's across members do",
		(side, direction) => {
			const sideAxis = createSideAxis(side);
			const layoutAxis = createLayoutAxis(direction);
			expect(sideAxis.across(POINT)).toBe(layoutAxis.across(POINT));
			expect(sideAxis.acrossStart(BOX)).toBe(layoutAxis.acrossStart(BOX));
			expect(sideAxis.acrossExtent(BOX)).toBe(layoutAxis.acrossExtent(BOX));
		},
	);
});
