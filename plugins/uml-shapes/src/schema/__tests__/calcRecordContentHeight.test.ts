import { describe, expect, it } from "vitest";

import { calcRecordContentHeight } from "../calcRecordContentHeight";
import { calcRecordListHeight, RECORD_BAND_HEIGHT } from "../RecordDoc";

describe("calcRecordContentHeight", () => {
	it("sums one band and one compartment the way the stencils size a fresh record", () => {
		expect(
			calcRecordContentHeight({
				width: 180,
				text: {
					name: { text: "Class" },
					attributes: { text: ["+ attribute: Type"] },
					operations: { text: ["+ a(): Type", "+ b(): Type"] },
				},
			}),
		).toBe(
			RECORD_BAND_HEIGHT + calcRecordListHeight(1) + calcRecordListHeight(2),
		);
	});

	it("gives a box with no text one band's worth", () => {
		expect(calcRecordContentHeight({ width: 180 })).toBe(RECORD_BAND_HEIGHT);
	});
});
