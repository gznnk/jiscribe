import { describe, expect, it } from "vitest";

import {
	ObjectTextEditLineBreaksRegistry,
	resolveTextEditLineBreaks,
} from "../ObjectTextEditLineBreaksRegistry";

/** Stand-in for a type whose header slot is multi-line and whose row slots are one line tall. */
const resolveRowLineBreaks = (slotId: string) =>
	slotId === "name" ? ("allow" as const) : ("reject" as const);

describe("ObjectTextEditLineBreaksRegistry", () => {
	it("keeps the resolver per registered type", () => {
		const registry = new ObjectTextEditLineBreaksRegistry();
		registry.register("erEntity", resolveRowLineBreaks);

		expect(registry.get("erEntity")).toBe(resolveRowLineBreaks);
		expect(registry.get("rect")).toBeUndefined();
	});

	it("clear removes all registrations", () => {
		const registry = new ObjectTextEditLineBreaksRegistry();
		registry.register("erEntity", resolveRowLineBreaks);
		registry.clear();
		expect(registry.get("erEntity")).toBeUndefined();
	});
});

describe("resolveTextEditLineBreaks", () => {
	it("allows line breaks in every slot of a type with no resolver", () => {
		expect(resolveTextEditLineBreaks("body")).toBe("allow");
		expect(resolveTextEditLineBreaks("name", undefined)).toBe("allow");
	});

	it("lets the resolver answer per slot", () => {
		expect(resolveTextEditLineBreaks("name", resolveRowLineBreaks)).toBe(
			"allow",
		);
		expect(resolveTextEditLineBreaks("r0c0", resolveRowLineBreaks)).toBe(
			"reject",
		);
	});
});
