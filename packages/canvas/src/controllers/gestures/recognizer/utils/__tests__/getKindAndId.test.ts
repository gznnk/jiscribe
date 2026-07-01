import { describe, it, expect } from "vitest";

import { getKindAndId } from "../getKindAndId";

const makeEl = (kind?: string, id?: string): Element => {
	const attrs: Record<string, string | undefined> = {
		"data-kind": kind,
		"data-id": id,
	};
	const el = {
		closest: (selector: string) => {
			if (selector === "[data-kind]" && kind !== undefined) {
				return el;
			}
			return null;
		},
		getAttribute: (attr: string) => attrs[attr] ?? null,
	};
	return el as unknown as Element;
};

const makeElNoMatch = (): Element =>
	({
		closest: () => null,
		getAttribute: () => null,
	}) as unknown as Element;

describe("getKindAndId", () => {
	it("returns null when there is no element with [data-kind]", () => {
		expect(getKindAndId(makeElNoMatch())).toBeNull();
	});

	it("returns null when [data-kind] is present but data-id is missing", () => {
		const el = makeEl("rect", undefined);
		expect(getKindAndId(el)).toBeNull();
	});

	it("returns { kind, id } when both [data-kind] and data-id are present", () => {
		const el = makeEl("rect", "obj-1");
		expect(getKindAndId(el)).toEqual({ kind: "rect", id: "obj-1" });
	});

	it("returns the correct values when kind='control' and id='ctrl-2'", () => {
		const el = makeEl("control", "ctrl-2");
		expect(getKindAndId(el)).toEqual({ kind: "control", id: "ctrl-2" });
	});
});
