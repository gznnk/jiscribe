import { describe, it, expect } from "vitest";

import { getKindAndId } from "../getKindAndId";

const makeEl = (kind?: string, id?: string, part?: string): Element => {
	const attrs: Record<string, string | undefined> = {
		"data-kind": kind,
		"data-id": id,
		"data-part": part,
	};
	const el = {
		closest: (selector: string) => {
			if (selector === "[data-kind]" && kind !== undefined) {
				return el;
			}
			if (selector === "[data-part]" && part !== undefined) {
				return el;
			}
			return null;
		},
		getAttribute: (attr: string) => attrs[attr] ?? null,
	};
	return el as unknown as Element;
};

/**
 * Two elements: the pressed one carries [data-part], an ancestor carries
 * [data-kind]/[data-id]. `partOutsideKind` puts the part element above the kind
 * element instead, which must not be read.
 */
const makeNestedPartEl = (
	kind: string,
	id: string,
	part: string,
	{ partOutsideKind = false }: { partOutsideKind?: boolean } = {},
): { partEl: Element; kindEl: Element } => {
	const kindEl = {
		getAttribute: (attr: string) =>
			({ "data-kind": kind, "data-id": id })[attr] ?? null,
		contains: (other: Element) => !partOutsideKind && other === partEl,
	} as unknown as Element;
	const partEl = {
		closest: (selector: string) =>
			selector === "[data-kind]"
				? kindEl
				: selector === "[data-part]"
					? partEl
					: null,
		getAttribute: (attr: string) => (attr === "data-part" ? part : null),
	} as unknown as Element;
	return { partEl, kindEl };
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

	it("returns part when the element also carries data-part", () => {
		const el = makeEl("connector", "c-1", "label");
		expect(getKindAndId(el)).toEqual({
			kind: "connector",
			id: "c-1",
			part: "label",
		});
	});

	it("reads data-part from a descendant of the [data-kind] element", () => {
		// A compartmented shape (record) keeps data-kind on a single element and puts
		// data-part on the per-compartment hit element.
		const { partEl } = makeNestedPartEl("object", "obj-1", "rows");
		expect(getKindAndId(partEl)).toEqual({
			kind: "object",
			id: "obj-1",
			part: "rows",
		});
	});

	it("ignores a data-part that sits outside the [data-kind] element", () => {
		const { partEl } = makeNestedPartEl("object", "obj-1", "rows", {
			partOutsideKind: true,
		});
		expect(getKindAndId(partEl)).toEqual({ kind: "object", id: "obj-1" });
	});
});
