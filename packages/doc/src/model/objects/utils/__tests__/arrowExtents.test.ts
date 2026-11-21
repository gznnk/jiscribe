import { describe, expect, it } from "vitest";

import { calcArrowHeadLength, readArrowExtent } from "../arrowExtents";
import {
	ARROW_SIZE,
	CROSS_ARM,
	CROW_FOOT_ZERO_MANY_INSET,
} from "../arrowHeadDimensions";

describe("calcArrowHeadLength", () => {
	it("scales the head's length along the line by the stroke width and the arrow scale", () => {
		expect(calcArrowHeadLength("FilledTriangle", 2, 1)).toBe(ARROW_SIZE * 2);
		expect(calcArrowHeadLength("FilledTriangle", 2, 1.5)).toBe(ARROW_SIZE * 3);
	});

	it("measures a head running past its inset by its rear, not by where the line stops", () => {
		expect(calcArrowHeadLength("Cross", 1, 1)).toBe(CROSS_ARM * 2);
		expect(calcArrowHeadLength("CrowFootZeroMany", 1, 1)).toBe(
			CROW_FOOT_ZERO_MANY_INSET,
		);
	});

	it("measures 0 where no head is drawn", () => {
		expect(calcArrowHeadLength("None", 2, 1)).toBe(0);
		expect(calcArrowHeadLength(undefined, 2, 1)).toBe(0);
		expect(readArrowExtent("None")).toBeNull();
	});
});
