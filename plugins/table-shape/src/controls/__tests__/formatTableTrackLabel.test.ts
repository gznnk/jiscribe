import { describe, expect, it } from "vitest";

import { formatTableTrackLabel } from "../formatTableTrackLabel";

describe("formatTableTrackLabel", () => {
	it("numbers rows from 1", () => {
		expect(formatTableTrackLabel("row", 0)).toBe("1");
		expect(formatTableTrackLabel("row", 9)).toBe("10");
	});

	it("letters columns the way a spreadsheet does, Z followed by AA", () => {
		expect(formatTableTrackLabel("column", 0)).toBe("A");
		expect(formatTableTrackLabel("column", 25)).toBe("Z");
		expect(formatTableTrackLabel("column", 26)).toBe("AA");
		expect(formatTableTrackLabel("column", 51)).toBe("AZ");
		expect(formatTableTrackLabel("column", 52)).toBe("BA");
		expect(formatTableTrackLabel("column", 701)).toBe("ZZ");
		expect(formatTableTrackLabel("column", 702)).toBe("AAA");
	});
});
