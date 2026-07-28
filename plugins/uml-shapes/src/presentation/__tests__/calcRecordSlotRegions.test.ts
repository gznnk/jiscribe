import type { TextSlot } from "@workspace/canvas/doc";
import { TEXT_LINE_HEIGHT } from "@workspace/canvas/unstable-doc";
import { describe, it, expect } from "vitest";

import {
	RECORD_HEADER_HEIGHT,
	RECORD_SLOT_STYLE_DEFAULTS,
} from "../../schema/RecordDoc";
import { calcRecordSlotRegions } from "../calcRecordSlotRegions";
import { calcRecordTextRegion } from "../calcRecordTextRegion";

/**
 * The band height is derived through the shared text measurement, which has no
 * canvas in the node environment and falls back to `characters × fontSize × 0.6`
 * (measureText 参照). At the default fontSize 14 that is 8.4px per character, and
 * a 180px box wraps at 168px = 20 characters — what the wrapping cases below are
 * written against.
 */
const nameSlot = (
	text: string,
	style: Partial<TextSlot> = {},
): { name: TextSlot } => ({
	name: { ...RECORD_SLOT_STYLE_DEFAULTS, ...style, text },
});

/** Height of one line of text at the given size, without the band's padding. */
const lineHeightOf = (fontSize: number): number => fontSize * TEXT_LINE_HEIGHT;

describe("calcRecordSlotRegions", () => {
	it("puts the title band across the top and the rows under it", () => {
		const { name, rows } = calcRecordSlotRegions({ width: 180, height: 100 });
		expect(name).toEqual({
			x: -90,
			y: -50,
			width: 180,
			height: RECORD_HEADER_HEIGHT,
		});
		expect(rows).toEqual({
			x: -90,
			y: -50 + RECORD_HEADER_HEIGHT,
			width: 180,
			height: 100 - RECORD_HEADER_HEIGHT,
		});
	});

	it("a one-line title at the default size keeps the default band height", () => {
		const { name } = calcRecordSlotRegions({
			width: 180,
			height: 100,
			text: nameSlot("User"),
		});
		expect(name.height).toBe(RECORD_HEADER_HEIGHT);
	});

	it("a larger fontSize grows the band by that line height", () => {
		const { name, rows } = calcRecordSlotRegions({
			width: 180,
			height: 200,
			text: nameSlot("User", { fontSize: 28 }),
		});
		expect(name.height).toBe(
			RECORD_HEADER_HEIGHT - lineHeightOf(14) + lineHeightOf(28),
		);
		// The rows give up exactly what the band took.
		expect(name.height + rows.height).toBe(200);
		expect(rows.y).toBe(-100 + name.height);
	});

	it("an authored newline in the title adds a line to the band", () => {
		const { name } = calcRecordSlotRegions({
			width: 180,
			height: 200,
			text: nameSlot("User\nAccount"),
		});
		expect(name.height).toBe(RECORD_HEADER_HEIGHT + lineHeightOf(14));
	});

	it("a title too long for the width wraps and grows the band", () => {
		// Two 10-character words: 21 characters = 176.4px, past the 168px the box
		// leaves, and the word boundary puts the second word on its own line.
		const { name } = calcRecordSlotRegions({
			width: 180,
			height: 200,
			text: nameSlot("aaaaaaaaaa aaaaaaaaaa"),
		});
		expect(name.height).toBe(RECORD_HEADER_HEIGHT + lineHeightOf(14));
	});

	it("the same title in a wider box stays on one line", () => {
		const { name } = calcRecordSlotRegions({
			width: 400,
			height: 200,
			text: nameSlot("aaaaaaaaaa aaaaaaaaaa"),
		});
		expect(name.height).toBe(RECORD_HEADER_HEIGHT);
	});

	it("leaves no gap and no overlap between the two compartments", () => {
		const { name, rows } = calcRecordSlotRegions({ width: 120, height: 90 });
		expect(name.y + name.height).toBe(rows.y);
		expect(name.height + rows.height).toBe(90);
	});

	it("shrinks the band rather than giving the rows a negative height", () => {
		const { name, rows } = calcRecordSlotRegions({ width: 120, height: 10 });
		expect(name.height).toBe(10);
		expect(rows.height).toBe(0);
	});

	it("clamps a grown band to the box height too", () => {
		const { name, rows } = calcRecordSlotRegions({
			width: 180,
			height: 40,
			text: nameSlot("User\nAccount\nRecord"),
		});
		expect(name.height).toBe(40);
		expect(rows.height).toBe(0);
	});
});

describe("calcRecordTextRegion", () => {
	it("returns the compartment matching the slot id", () => {
		const state = { width: 180, height: 100 };
		const regions = calcRecordSlotRegions(state);
		expect(calcRecordTextRegion(state, "name")).toEqual(regions.name);
		expect(calcRecordTextRegion(state, "rows")).toEqual(regions.rows);
	});

	it("falls back to the title band for an unknown slot id", () => {
		const state = { width: 180, height: 100 };
		expect(calcRecordTextRegion(state, "nope")).toEqual(
			calcRecordSlotRegions(state).name,
		);
	});

	it("places the rows under the band the title actually needs", () => {
		const state = {
			width: 180,
			height: 200,
			text: nameSlot("User\nAccount"),
		};
		const regions = calcRecordSlotRegions(state);
		expect(calcRecordTextRegion(state, "rows")).toEqual(regions.rows);
		expect(regions.rows.y).toBe(-100 + regions.name.height);
	});
});
