import { describe, expect, it } from "vitest";

import type { ObjectPartRange } from "../ObjectPartSelection";
import { readActivePartFocusId } from "../readActivePartFocusId";
import { TEXT_SLOT_PART_KIND } from "../textSlotPartKind";

const partOf = (ranges: ObjectPartRange[]) => ({
	kind: TEXT_SLOT_PART_KIND,
	ranges,
});

describe("readActivePartFocusId", () => {
	it("gives the one id a collapsed range names", () => {
		expect(
			readActivePartFocusId(partOf([{ anchorId: "name", focusId: "name" }])),
		).toBe("name");
	});

	it("gives the focus of a range whose ends differ, never its anchor", () => {
		expect(
			readActivePartFocusId(partOf([{ anchorId: "name", focusId: "rows" }])),
		).toBe("rows");
	});

	it("reads the last range, the active one", () => {
		expect(
			readActivePartFocusId(
				partOf([
					{ anchorId: "rows", focusId: "rows" },
					{ anchorId: "name", focusId: "operations" },
				]),
			),
		).toBe("operations");
	});
});
