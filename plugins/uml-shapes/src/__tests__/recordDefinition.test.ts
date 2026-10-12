import { describe, it, expect } from "vitest";

import { recordDefinition } from "../definition";
import {
	RECORD_ATTRIBUTES_TEXT_SLOT_ID,
	RECORD_NAME_TEXT_SLOT_ID,
	RECORD_OPERATIONS_TEXT_SLOT_ID,
	RECORD_STEREOTYPE_TEXT_SLOT_ID,
} from "../schema/RecordDoc";

describe("recordDefinition.textEditOverflow", () => {
	it("grows both header bands' editors and scrolls every compartment's", () => {
		const resolve = recordDefinition.textEditOverflow;
		expect(resolve).toBeDefined();
		expect(resolve?.(RECORD_STEREOTYPE_TEXT_SLOT_ID)).toBe("grow");
		expect(resolve?.(RECORD_NAME_TEXT_SLOT_ID)).toBe("grow");
		expect(resolve?.(RECORD_ATTRIBUTES_TEXT_SLOT_ID)).toBe("scroll");
		expect(resolve?.(RECORD_OPERATIONS_TEXT_SLOT_ID)).toBe("scroll");
	});
});
