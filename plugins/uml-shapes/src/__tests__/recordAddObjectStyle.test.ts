import { createDocOps, type CanvasDoc } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { umlDocPlugin } from "../doc";

const docOps = createDocOps({ plugins: [umlDocPlugin] });

// A record keeps its texts as slots under `text`, which is where add_object's
// typography goes: every slot the new record holds, nothing at the root.
describe("a record created with typography", () => {
	it("carries it on every slot it is created with, and nowhere else", () => {
		const doc: CanvasDoc = { version: 1, root: [] };
		const id = docOps.addObject(doc, "record", {
			x: 0,
			y: 0,
			fontSize: 18,
			fontWeight: "bold",
		});

		const record = doc.root.find((object) => object.id === id) as unknown as {
			text: Record<string, Record<string, unknown>>;
		} & Record<string, unknown>;
		const slots = Object.values(record.text);
		expect(slots.length).toBeGreaterThan(0);
		for (const slot of slots) {
			expect(slot).toMatchObject({ fontSize: 18, fontWeight: "bold" });
		}
		expect(record).not.toHaveProperty("fontSize");
		expect(record).not.toHaveProperty("fontWeight");
	});
});
