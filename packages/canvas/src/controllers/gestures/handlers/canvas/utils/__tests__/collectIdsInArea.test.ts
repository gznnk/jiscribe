import type { BoundingBox } from "@jiscribe/geometry";
import { describe, it, expect } from "vitest";

import { collectIdsInArea } from "../collectIdsInArea";

const bbox = (
	left: number,
	top: number,
	right: number,
	bottom: number,
): BoundingBox => ({ left, top, right, bottom });

describe("collectIdsInArea", () => {
	it("returns [] when there are no bboxes", () => {
		expect(collectIdsInArea({}, 0, 0, 100, 100)).toEqual([]);
	});

	it("includes objects fully contained within the area", () => {
		const bboxes = { r: bbox(30, 30, 70, 70) };
		expect(collectIdsInArea(bboxes, 0, 0, 100, 100)).toContain("r");
	});

	it("excludes objects that partially overflow (past the right edge)", () => {
		const bboxes = { r: bbox(70, 30, 110, 70) };
		expect(collectIdsInArea(bboxes, 0, 0, 100, 100)).not.toContain("r");
	});

	it("excludes objects entirely outside the area", () => {
		const bboxes = { r: bbox(180, 180, 220, 220) };
		expect(collectIdsInArea(bboxes, 0, 0, 100, 100)).not.toContain("r");
	});

	it("includes when the bbox edge exactly touches the area boundary", () => {
		const bboxes = { r: bbox(0, 0, 100, 100) };
		expect(collectIdsInArea(bboxes, 0, 0, 100, 100)).toContain("r");
	});

	it("returns only the in-area objects when in- and out-of-area are mixed", () => {
		const bboxes = {
			inside: bbox(30, 30, 70, 70),
			outside: bbox(180, 180, 220, 220),
		};
		const result = collectIdsInArea(bboxes, 0, 0, 100, 100);
		expect(result).toEqual(["inside"]);
	});
});
