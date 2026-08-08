import { describe, expect, it } from "vitest";

import {
	ObjectTextEditOverflowRegistry,
	resolveTextEditOverflow,
} from "../ObjectTextEditOverflowRegistry";

/** Stand-in for a two-slot type whose slots disagree (mirrors the record). */
const resolveBandOverflow = (slotId: string) =>
	slotId === "name" ? ("grow" as const) : ("scroll" as const);

describe("ObjectTextEditOverflowRegistry", () => {
	it("keeps the resolver per registered type", () => {
		const registry = new ObjectTextEditOverflowRegistry();
		registry.register("record", resolveBandOverflow);

		expect(registry.get("record")).toBe(resolveBandOverflow);
		expect(registry.get("rect")).toBeUndefined();
	});

	it("clear removes all registrations", () => {
		const registry = new ObjectTextEditOverflowRegistry();
		registry.register("record", resolveBandOverflow);
		registry.clear();
		expect(registry.get("record")).toBeUndefined();
	});
});

describe("resolveTextEditOverflow", () => {
	it("scrolls every slot of a type with no resolver", () => {
		expect(resolveTextEditOverflow("body")).toBe("scroll");
		expect(resolveTextEditOverflow("name", undefined)).toBe("scroll");
	});

	it("lets the resolver answer per slot", () => {
		expect(resolveTextEditOverflow("name", resolveBandOverflow)).toBe("grow");
		expect(resolveTextEditOverflow("rows", resolveBandOverflow)).toBe("scroll");
	});
});
