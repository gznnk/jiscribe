import { describe, it, expect } from "vitest";

import { contextOf, rectOf } from "../../__tests__/support/styleFixtures";
import { lockAspectRatioEntry } from "../lockAspectRatioEntry";

const lockOf = (object: unknown): unknown =>
	(object as Record<string, unknown>).lockAspectRatio;

/** A target reached through a selected group rather than selected itself. */
const asDescendant = contextOf({ selected: false });

describe("lockAspectRatioEntry", () => {
	describe("apply", () => {
		it("writes the flag onto the selected object", () => {
			const a = rectOf("a", { lockAspectRatio: false });
			expect(
				lockOf(lockAspectRatioEntry.apply(a, null, true, contextOf())),
			).toBe(true);
		});

		it("writes a flag the object did not carry at all", () => {
			const a = rectOf("a");
			expect(
				lockOf(lockAspectRatioEntry.apply(a, null, true, contextOf())),
			).toBe(true);
		});

		it("the value already there → the object itself", () => {
			const a = rectOf("a", { lockAspectRatio: true });
			expect(lockAspectRatioEntry.apply(a, null, true, contextOf())).toBe(a);
		});

		it("a descendant of a selected group keeps its own lock", () => {
			const a = rectOf("a", { lockAspectRatio: false });
			expect(
				lockAspectRatioEntry.apply(a, null, true, asDescendant),
			).toBeNull();
		});

		it("leaves the object it was given as it was", () => {
			const a = rectOf("a", { lockAspectRatio: false });
			lockAspectRatioEntry.apply(a, null, true, contextOf());
			expect(lockOf(a)).toBe(false);
		});
	});

	describe("read", () => {
		it("the object's own flag", () => {
			expect(
				lockAspectRatioEntry.read(
					rectOf("a", { lockAspectRatio: true }),
					null,
					contextOf(),
				),
			).toEqual([true]);
		});

		it("no flag at all → the two axes free", () => {
			expect(lockAspectRatioEntry.read(rectOf("a"), null, contextOf())).toEqual(
				[false],
			);
		});

		it("a flag holding anything but a boolean reads as unset", () => {
			expect(
				lockAspectRatioEntry.read(
					rectOf("a", { lockAspectRatio: "yes" }),
					null,
					contextOf(),
				),
			).toEqual([false]);
		});

		it("a descendant of a selected group has no say", () => {
			expect(
				lockAspectRatioEntry.read(
					rectOf("a", { lockAspectRatio: true }),
					null,
					asDescendant,
				),
			).toEqual([]);
		});
	});
});
