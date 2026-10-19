import type { ObjectDocDefinition } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { flowchartDocPlugin } from "../doc";

// The plugin contract leaves `objects` optional; this plugin is nothing but its
// shapes, so the tests below read them as the record they are.
const docDefinitions = flowchartDocPlugin.objects as Record<
	string,
	ObjectDocDefinition
>;

/**
 * Which flowchart shapes declare `features.textVerticalBasis`: the ones whose
 * region gives up part of their own height, so the two bases put the body in
 * different places. Pinned over the real declarations because this is the set
 * the ObjectMenu shows the switch for, and the declaration agreeing with the
 * region is the parse-check suite's business rather than this one's.
 */
describe("the flowchart shapes the vertical-basis switch moves", () => {
	it("names the shapes that keep their text off a band of their own height", () => {
		const declared = Object.entries(docDefinitions)
			.filter(
				([, definition]) => definition.features.textVerticalBasis === true,
			)
			.map(([type]) => type)
			.sort();

		expect(declared).toEqual([
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
			expect(docDefinitions[type].features.textVerticalBasis, type).toBe(
				undefined,
			);
		}
	});

	it("leaves out a shape whose caps change axis with its aspect ratio", () => {
		// A stadium's caps sit left and right while it is wider than tall and top
		// and bottom once it is not, so the switch would move its text at some
		// sizes and not at others.
		expect(docDefinitions.stadium.features.textVerticalBasis).toBe(undefined);
	});

	it("leaves out the shapes whose label is drawn outside the box", () => {
		for (const type of ["cross", "extract"]) {
			expect(docDefinitions[type].features.textVerticalBasis, type).toBe(
				undefined,
			);
		}
	});
});
