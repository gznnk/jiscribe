import { describe, it, expect } from "vitest";

import { parseSvgPathPoints } from "./support/parseSvgPathPoints";

/**
 * The shape builders are asserted through this parser, so a parser bug would
 * silently weaken those suites rather than fail them.
 */
describe("parseSvgPathPoints", () => {
	it("reads M and L as coordinate pairs", () => {
		expect(parseSvgPathPoints("M 10 20 L 30 40")).toEqual([
			{ x: 10, y: 20 },
			{ x: 30, y: 40 },
		]);
	});

	it("resolves V and H against the current point", () => {
		expect(parseSvgPathPoints("M 10 20 V 50 H 30 L 1 2")).toEqual([
			{ x: 10, y: 20 },
			{ x: 10, y: 50 },
			{ x: 30, y: 50 },
			{ x: 1, y: 2 },
		]);
	});

	it("keeps a cubic's control points as their own points", () => {
		expect(parseSvgPathPoints("M 0 0 C 1 2 3 4 5 6")).toHaveLength(4);
	});

	it("carries the command across repeated coordinate pairs", () => {
		expect(parseSvgPathPoints("M 0 0 L 1 1 2 2")).toEqual([
			{ x: 0, y: 0 },
			{ x: 1, y: 1 },
			{ x: 2, y: 2 },
		]);
	});

	it("ignores Z and surrounding whitespace", () => {
		expect(parseSvgPathPoints("  M 0 0 L 1 1 Z  ")).toEqual([
			{ x: 0, y: 0 },
			{ x: 1, y: 1 },
		]);
	});

	it("reads negative and fractional coordinates", () => {
		expect(parseSvgPathPoints("M -1.5 -2.25")).toEqual([{ x: -1.5, y: -2.25 }]);
	});
});
