import { describe, expect, it } from "vitest";

import {
	calcMixedColorSegments,
	MAX_MIXED_COLOR_SEGMENTS,
} from "../calcMixedColorSegments";

describe("calcMixedColorSegments", () => {
	it("splits two colors into halves, in order", () => {
		expect(calcMixedColorSegments(["#f00", "#0f0"])).toEqual([
			{ color: "#f00", start: 0, end: 0.5 },
			{ color: "#0f0", start: 0.5, end: 1 },
		]);
	});

	it("splits three colors into thirds covering the whole", () => {
		const segments = calcMixedColorSegments(["#f00", "#0f0", "#00f"]);
		expect(segments.map((segment) => segment.color)).toEqual([
			"#f00",
			"#0f0",
			"#00f",
		]);
		expect(segments[0].start).toBe(0);
		expect(segments[1].start).toBe(segments[0].end);
		expect(segments[2].start).toBe(segments[1].end);
		expect(segments[2].end).toBe(1);
	});

	it("keeps only the first MAX_MIXED_COLOR_SEGMENTS colors", () => {
		const segments = calcMixedColorSegments(["#f00", "#0f0", "#00f", "#fff"]);
		expect(segments).toHaveLength(MAX_MIXED_COLOR_SEGMENTS);
		expect(segments.map((segment) => segment.color)).not.toContain("#fff");
		expect(segments.at(-1)?.end).toBe(1);
	});

	it("yields no slices for no colors", () => {
		expect(calcMixedColorSegments([])).toEqual([]);
	});
});
