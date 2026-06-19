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
	it("[data-kind] を持つ要素がないとき null を返す", () => {
		expect(getKindAndId(makeElNoMatch())).toBeNull();
	});

	it("[data-kind] はあるが data-id がないとき null を返す", () => {
		const el = makeEl("rect", undefined);
		expect(getKindAndId(el)).toBeNull();
	});

	it("[data-kind] も data-id もあるとき { kind, id } を返す", () => {
		const el = makeEl("rect", "obj-1");
		expect(getKindAndId(el)).toEqual({ kind: "rect", id: "obj-1" });
	});

	it("kind='control'・id='ctrl-2' のとき正しい値を返す", () => {
		const el = makeEl("control", "ctrl-2");
		expect(getKindAndId(el)).toEqual({ kind: "control", id: "ctrl-2" });
	});
});
