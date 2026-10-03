import { describe, expect, it } from "vitest";

import { parseTableBoundaryIndex } from "../tableBoundaryPart";

describe("parseTableBoundaryIndex", () => {
	it("reads a plainly written index", () => {
		expect(parseTableBoundaryIndex("0")).toBe(0);
		expect(parseTableBoundaryIndex("12")).toBe(12);
	});

	it("refuses anything but a plain non-negative integer", () => {
		// DOM text, so every one of these is reachable — and none of them names a
		// boundary the grid offered.
		for (const subPart of ["", " 1", "1 ", "1.0", "-1", "1e1", "0x1", "x"]) {
			expect(parseTableBoundaryIndex(subPart)).toBeNull();
		}
	});

	it("refuses a strip carrying no index at all", () => {
		expect(parseTableBoundaryIndex(undefined)).toBeNull();
	});
});
