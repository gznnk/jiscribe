import { describe, expect, it } from "vitest";

import { buildOutsideSheetClipPath } from "../buildOutsideSheetClipPath";

describe("buildOutsideSheetClipPath", () => {
	const sheetPath = "M 1 2 H 3 Z";

	it("keeps the punched-out sheet as its own subpath", () => {
		expect(buildOutsideSheetClipPath(sheetPath, 140, 100)).toContain(sheetPath);
	});

	it("frames the shape with room to spare, so strokes at the edge stay clipped", () => {
		// Even-odd only reads as "outside the sheet" while the frame encloses
		// everything drawn; it spans ±width / ±height around the centered box.
		expect(buildOutsideSheetClipPath(sheetPath, 140, 100)).toContain(
			"M -140 -100 H 140 V 100 H -140 Z",
		);
	});
});
