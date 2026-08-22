import { TEXT_LINE_HEIGHT } from "@jiscribe/canvas-sdk/doc";
import type { TextSlot } from "@jiscribe/doc";
import { describe, it, expect } from "vitest";

import {
	calcRecordListHeight,
	RECORD_BAND_HEIGHT,
	RECORD_SLOT_STYLE_DEFAULTS,
} from "../../schema/RecordDoc";
import { calcRecordSlotRegions } from "../calcRecordSlotRegions";
import { calcRecordTextRegion } from "../calcRecordTextRegion";

/**
 * A text band's slot (the stereotype, the title). Its height is derived through
 * the shared text measurement, which has no canvas in the node environment and
 * falls back to `characters × fontSize × 0.6` (see createTextWidthMeasurer) — the fallback
 * ignores fontWeight, so the bold title measures as the regular one here. At the
 * default fontSize 14 that is 8.4px per character, and a 180px box wraps at
 * 168px = 20 characters — what the wrapping cases below are written against.
 */
const bandSlot = (text: string, style: Partial<TextSlot> = {}): TextSlot => ({
	...RECORD_SLOT_STYLE_DEFAULTS,
	...style,
	text,
});

/** A compartment slot holding the given rows. */
const listSlot = (rows: string[], style: Partial<TextSlot> = {}): TextSlot => ({
	...RECORD_SLOT_STYLE_DEFAULTS,
	...style,
	text: rows,
});

/** The common two-compartment shape: a title over an attribute compartment. */
const titleAndAttributes = (
	title: string,
	style: Partial<TextSlot> = {},
): Record<string, TextSlot> => ({
	name: bandSlot(title, style),
	attributes: listSlot([]),
});

/** Height of one line of text at the given size, without the band's padding. */
const lineHeightOf = (fontSize: number): number => fontSize * TEXT_LINE_HEIGHT;

describe("calcRecordSlotRegions", () => {
	it("gives the band the whole box when the title is the only slot", () => {
		const regions = calcRecordSlotRegions({ width: 180, height: 100 });
		expect(regions.name).toEqual({
			x: -90,
			y: -50,
			width: 180,
			height: 100,
		});
		expect(regions.attributes).toBeUndefined();
		expect(regions.operations).toBeUndefined();
	});

	it("puts the title band across the top and the compartment under it", () => {
		const { name, attributes } = calcRecordSlotRegions({
			width: 180,
			height: 100,
			text: titleAndAttributes(""),
		});
		expect(name).toEqual({
			x: -90,
			y: -50,
			width: 180,
			height: RECORD_BAND_HEIGHT,
		});
		expect(attributes).toEqual({
			x: -90,
			y: -50 + RECORD_BAND_HEIGHT,
			width: 180,
			height: 100 - RECORD_BAND_HEIGHT,
		});
	});

	it("a one-line title at the default size keeps the default band height", () => {
		const { name } = calcRecordSlotRegions({
			width: 180,
			height: 100,
			text: titleAndAttributes("User"),
		});
		expect(name.height).toBe(RECORD_BAND_HEIGHT);
	});

	it("a larger fontSize grows the band by that line height", () => {
		const { name, attributes } = calcRecordSlotRegions({
			width: 180,
			height: 200,
			text: titleAndAttributes("User", { fontSize: 28 }),
		});
		expect(name.height).toBe(
			RECORD_BAND_HEIGHT - lineHeightOf(14) + lineHeightOf(28),
		);
		// The compartment gives up exactly what the band took.
		expect(name.height + (attributes?.height ?? 0)).toBe(200);
		expect(attributes?.y).toBe(-100 + name.height);
	});

	it("an authored newline in the title adds a line to the band", () => {
		const { name } = calcRecordSlotRegions({
			width: 180,
			height: 200,
			text: titleAndAttributes("User\nAccount"),
		});
		expect(name.height).toBe(RECORD_BAND_HEIGHT + lineHeightOf(14));
	});

	it("a title too long for the width wraps and grows the band", () => {
		// Two 10-character words: 21 characters = 176.4px, past the 168px the box
		// leaves, and the word boundary puts the second word on its own line.
		const { name } = calcRecordSlotRegions({
			width: 180,
			height: 200,
			text: titleAndAttributes("aaaaaaaaaa aaaaaaaaaa"),
		});
		expect(name.height).toBe(RECORD_BAND_HEIGHT + lineHeightOf(14));
	});

	it("the same title in a wider box stays on one line", () => {
		const { name } = calcRecordSlotRegions({
			width: 400,
			height: 200,
			text: titleAndAttributes("aaaaaaaaaa aaaaaaaaaa"),
		});
		expect(name.height).toBe(RECORD_BAND_HEIGHT);
	});

	it("leaves no gap and no overlap between the compartments", () => {
		const { name, attributes } = calcRecordSlotRegions({
			width: 120,
			height: 90,
			text: titleAndAttributes(""),
		});
		expect(name.y + name.height).toBe(attributes?.y);
		expect(name.height + (attributes?.height ?? 0)).toBe(90);
	});

	it("shrinks the band rather than giving the compartment a negative height", () => {
		const { name, attributes } = calcRecordSlotRegions({
			width: 120,
			height: 10,
			text: titleAndAttributes(""),
		});
		expect(name.height).toBe(10);
		expect(attributes?.height).toBe(0);
	});

	it("clamps a grown band to the box height too", () => {
		const { name, attributes } = calcRecordSlotRegions({
			width: 180,
			height: 40,
			text: titleAndAttributes("User\nAccount\nRecord"),
		});
		expect(name.height).toBe(40);
		expect(attributes?.height).toBe(0);
	});

	it("stacks the stereotype above the title and the compartments below both", () => {
		const { stereotype, name, attributes, operations } = calcRecordSlotRegions({
			width: 180,
			height: 200,
			text: {
				stereotype: bandSlot("<<interface>>"),
				name: bandSlot("Repository"),
				attributes: listSlot(["id: string"]),
				operations: listSlot(["save()"]),
			},
		});
		expect(stereotype).toEqual({
			x: -90,
			y: -100,
			width: 180,
			height: RECORD_BAND_HEIGHT,
		});
		expect(name).toEqual({
			x: -90,
			y: -100 + RECORD_BAND_HEIGHT,
			width: 180,
			height: RECORD_BAND_HEIGHT,
		});
		expect(attributes).toEqual({
			x: -90,
			y: -100 + RECORD_BAND_HEIGHT * 2,
			width: 180,
			height: calcRecordListHeight(1),
		});
		// The bottom compartment takes what the three above it left.
		expect(operations).toEqual({
			x: -90,
			y: -100 + RECORD_BAND_HEIGHT * 2 + calcRecordListHeight(1),
			width: 180,
			height: 200 - RECORD_BAND_HEIGHT * 2 - calcRecordListHeight(1),
		});
	});

	it("sizes a middle compartment to its rows and leaves the rest to the bottom one", () => {
		const { name, attributes, operations } = calcRecordSlotRegions({
			width: 180,
			height: 200,
			text: {
				name: bandSlot("User"),
				attributes: listSlot(["id: string", "email: string"]),
				operations: listSlot([]),
			},
		});
		expect(name.height).toBe(RECORD_BAND_HEIGHT);
		expect(attributes?.height).toBe(calcRecordListHeight(2));
		expect(operations?.height).toBe(
			200 - RECORD_BAND_HEIGHT - calcRecordListHeight(2),
		);
		expect(attributes?.y).toBe(-100 + RECORD_BAND_HEIGHT);
		expect(operations?.y).toBe(
			-100 + RECORD_BAND_HEIGHT + calcRecordListHeight(2),
		);
	});

	it("a larger fontSize on a compartment grows its share of the box", () => {
		const { attributes, operations } = calcRecordSlotRegions({
			width: 180,
			height: 300,
			text: {
				name: bandSlot("User"),
				attributes: listSlot(["id: string", "email: string"], {
					fontSize: 28,
				}),
				operations: listSlot([]),
			},
		});
		expect(attributes?.height).toBe(calcRecordListHeight(2, 28));
		// Each of the two rows grew by the line-height difference.
		expect(attributes?.height).toBe(
			calcRecordListHeight(2) + 2 * (lineHeightOf(28) - lineHeightOf(14)),
		);
		expect(operations?.y).toBe(
			-150 + RECORD_BAND_HEIGHT + calcRecordListHeight(2, 28),
		);
	});

	it("keeps an empty middle compartment one row tall", () => {
		const { attributes } = calcRecordSlotRegions({
			width: 180,
			height: 200,
			text: {
				name: bandSlot("User"),
				attributes: listSlot([]),
				operations: listSlot(["save()"]),
			},
		});
		expect(attributes?.height).toBe(calcRecordListHeight(0));
	});

	it("takes the compartments in order, leaving the bottom one nothing when the box runs out", () => {
		const { name, attributes, operations } = calcRecordSlotRegions({
			width: 180,
			height: 60,
			text: {
				name: bandSlot("User"),
				attributes: listSlot(["a", "b", "c", "d", "e"]),
				operations: listSlot([]),
			},
		});
		expect(name.height).toBe(RECORD_BAND_HEIGHT);
		expect(attributes?.height).toBe(60 - RECORD_BAND_HEIGHT);
		expect(operations?.height).toBe(0);
	});

	it("never lets the compartments overrun the box, whatever they ask for", () => {
		const regions = calcRecordSlotRegions({
			width: 180,
			height: 45,
			text: {
				name: bandSlot("User\nAccount"),
				attributes: listSlot(["a", "b", "c"]),
				operations: listSlot(["x"]),
			},
		});
		const total =
			regions.name.height +
			(regions.attributes?.height ?? 0) +
			(regions.operations?.height ?? 0);
		expect(total).toBe(45);
	});
});

describe("calcRecordTextRegion", () => {
	it("returns the compartment matching the slot id", () => {
		const state = {
			width: 180,
			height: 100,
			text: titleAndAttributes(""),
		};
		const regions = calcRecordSlotRegions(state);
		expect(calcRecordTextRegion(state, "name")).toEqual(regions.name);
		expect(calcRecordTextRegion(state, "attributes")).toEqual(
			regions.attributes,
		);
	});

	it("falls back to the title band for an unknown slot id", () => {
		const state = { width: 180, height: 100 };
		expect(calcRecordTextRegion(state, "nope")).toEqual(
			calcRecordSlotRegions(state).name,
		);
	});

	it("falls back to the title band for a compartment the box does not have", () => {
		const state = {
			width: 180,
			height: 100,
			text: titleAndAttributes(""),
		};
		expect(calcRecordTextRegion(state, "operations")).toEqual(
			calcRecordSlotRegions(state).name,
		);
	});

	it("places the compartment under the band the title actually needs", () => {
		const state = {
			width: 180,
			height: 200,
			text: titleAndAttributes("User\nAccount"),
		};
		const regions = calcRecordSlotRegions(state);
		expect(calcRecordTextRegion(state, "attributes")).toEqual(
			regions.attributes,
		);
		expect(regions.attributes?.y).toBe(-100 + regions.name.height);
	});
});
