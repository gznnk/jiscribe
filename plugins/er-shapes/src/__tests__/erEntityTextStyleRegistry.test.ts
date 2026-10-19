import { createCanvasRegistries } from "@jiscribe/canvas";
import { describe, expect, it } from "vitest";

import { erPlugin } from "../plugin";
import { resolveErEntityTextSlotStyle } from "../schema/erEntityTextSlotStyle";

const ENTITY = {
	text: {
		name: { text: "users" },
		"col:0:key": { text: "PK" },
		"col:0:name": { text: "id" },
		"col:0:type": { text: "bigint" },
		"col:1:key": { text: "FK" },
		"col:1:name": { text: "org_id" },
		"col:1:type": { text: "bigint" },
	},
};

describe("the registered erEntity defaults", () => {
	const registry = createCanvasRegistries({
		plugins: [erPlugin],
	}).objectTextStyleDefaults;

	it("resolve through the canvas registry as they do here", () => {
		const entity = {
			text: {
				...ENTITY.text,
				"col:0:key": { text: "PK", fontSize: 16, fontFamily: "serif" },
			},
		};
		for (const slotId of Object.keys(entity.text)) {
			expect(
				registry.resolveTextSlotStyle(
					"erEntity",
					slotId,
					entity.text[slotId as keyof typeof entity.text],
				),
			).toEqual(resolveErEntityTextSlotStyle(entity, slotId));
		}
	});

	it("answer a role off the slot id alone, with the same object on every read", () => {
		expect(registry.get("erEntity", "col:3:key")).toEqual({
			textAlign: "left",
			verticalAlign: "middle",
			fontColor: "auto",
			fontSize: 14,
			fontWeight: "bold",
		});
		expect(registry.get("erEntity", "col:3:key")).toBe(
			registry.get("erEntity", "col:0:key"),
		);
	});
});
