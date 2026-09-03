import type { ObjectDocDefinition } from "@jiscribe/doc";
import { hasInsetTextRegion } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { flowchartDocPlugin } from "../doc";

// The plugin contract leaves `objects` optional; this plugin is nothing but its
// shapes, so the tests below read them as the record they are.
const docDefinitions = flowchartDocPlugin.objects as Record<
	string,
	ObjectDocDefinition
>;

/**
 * Which flowchart shapes are worth offering the `textVerticalBasis` switch on:
 * the ones whose declared region gives up part of their own height, so the two
 * bases put the body in different places (`hasInsetTextRegion`). Pinned over the
 * real declarations because this is the set the ObjectMenu shows the switch for,
 * and a region reshaped for the outline's sake would move a shape between the
 * two lists without anyone noticing.
 */
describe("the flowchart shapes the vertical-basis switch moves", () => {
	it("names the shapes that keep their text off a band of their own height", () => {
		const inset = Object.entries(docDefinitions)
			.filter(([, definition]) => hasInsetTextRegion(definition))
			.map(([type]) => type)
			.sort();

		expect(inset).toEqual([
			"card",
			"db",
			"diamond",
			"document",
			"loopLimit",
			"manualInput",
			"multiDocument",
			"offPageConnector",
		]);
	});

	it("leaves out the shapes inset on the sides alone", () => {
		// Their caps and slants cut into the line horizontally, which is the extent
		// the basis never touches, so the switch would be a control that does nothing.
		for (const type of [
			"delay",
			"display",
			"hexagon",
			"parallelogram",
			"storedData",
			"subroutine",
			"trapezoid",
		]) {
			expect(hasInsetTextRegion(docDefinitions[type]), type).toBe(false);
		}
	});

	it("leaves out a shape whose caps change axis with its aspect ratio", () => {
		// A stadium's caps sit left and right while it is wider than tall and top
		// and bottom once it is not, so the switch would move its text at some
		// sizes and not at others.
		expect(hasInsetTextRegion(docDefinitions.stadium)).toBe(false);
	});

	it("leaves out the shapes whose label is drawn outside the box", () => {
		for (const type of ["cross", "extract"]) {
			expect(hasInsetTextRegion(docDefinitions[type]), type).toBe(false);
		}
	});
});
