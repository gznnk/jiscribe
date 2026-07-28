import { describe, it, expect } from "vitest";

import { recordDefinition } from "../definition";
import { RECORD_NAME_SLOT_ID, RECORD_ROWS_SLOT_ID } from "../schema/RecordDoc";

describe("recordDefinition.textEditOverflow", () => {
	it("grows the title band's editor and scrolls the rows editor", () => {
		const resolve = recordDefinition.textEditOverflow;
		expect(resolve).toBeDefined();
		expect(resolve?.(RECORD_NAME_SLOT_ID)).toBe("grow");
		expect(resolve?.(RECORD_ROWS_SLOT_ID)).toBe("scroll");
	});
});
