import { supportsAutoHeight } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { containerDocDefinition } from "../../doc";

describe("container auto height", () => {
	it("is denied, its region being the title band rather than the body", () => {
		// Sizing the box from the title would leave the header alone and swallow
		// whatever the container frames, so the height stays the document's.
		expect(containerDocDefinition.autoHeight).toBe(false);
		expect(supportsAutoHeight(containerDocDefinition)).toBe(false);
	});
});
