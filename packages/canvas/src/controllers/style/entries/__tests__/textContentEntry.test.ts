import { describe, it, expect } from "vitest";

import type { TextSlots } from "../../../../states/objects/types/TextSlots";
import { contextOf, textRectOf } from "../../__tests__/support/styleFixtures";
import { textContentEntry } from "../textContentEntry";

const slotsOf = (object: unknown): TextSlots =>
	(object as { text: TextSlots }).text;

describe("textContentEntry", () => {
	describe("apply", () => {
		it("writes the first slot, keeping its styling", () => {
			const a = textRectOf("a", { body: { text: "hello", fontSize: 12 } });
			const updated = textContentEntry.apply(a, null, "world", contextOf());
			expect(slotsOf(updated).body).toEqual({ text: "world", fontSize: 12 });
		});

		it("writes only the first slot of a multi-slot shape, key order kept", () => {
			const a = textRectOf("a", {
				name: { text: "User" },
				rows: { text: ["id"] },
			});
			const updated = textContentEntry.apply(a, null, "Account", contextOf());
			expect(slotsOf(updated)).toEqual({
				name: { text: "Account" },
				rows: { text: ["id"] },
			});
		});

		it("splits on newlines when the first slot holds rows", () => {
			const a = textRectOf("a", { rows: { text: ["id"] } });
			const updated = textContentEntry.apply(a, null, "id\nemail", contextOf());
			expect(slotsOf(updated).rows).toEqual({ text: ["id", "email"] });
		});

		it("the content already there → the object itself", () => {
			const a = textRectOf("a", { body: { text: "hello" } });
			expect(textContentEntry.apply(a, null, "hello", contextOf())).toBe(a);
		});

		it("a shape with no slot to write → null", () => {
			const a = textRectOf("a", {});
			expect(textContentEntry.apply(a, null, "world", contextOf())).toBeNull();
		});

		it("a descendant of a selected group is written too", () => {
			const a = textRectOf("a", { body: { text: "hello" } });
			const updated = textContentEntry.apply(
				a,
				null,
				"world",
				contextOf({ selected: false }),
			);
			expect(slotsOf(updated).body).toEqual({ text: "world" });
		});

		it("leaves the object it was given as it was", () => {
			const a = textRectOf("a", { body: { text: "hello" } });
			textContentEntry.apply(a, null, "world", contextOf());
			expect(slotsOf(a).body).toEqual({ text: "hello" });
		});
	});

	describe("read", () => {
		it("the first slot's content as plain text", () => {
			const a = textRectOf("a", {
				body: { text: [{ text: "he" }, { text: "llo", fontWeight: "bold" }] },
			});
			expect(textContentEntry.read(a, null, contextOf())).toEqual(["hello"]);
		});

		it("rows read as one body, joined at the row breaks", () => {
			const a = textRectOf("a", { rows: { text: ["id", "email"] } });
			expect(textContentEntry.read(a, null, contextOf())).toEqual([
				"id\nemail",
			]);
		});

		it("a shape with no slot has nothing to report", () => {
			expect(
				textContentEntry.read(textRectOf("a", {}), null, contextOf()),
			).toEqual([]);
		});
	});
});
