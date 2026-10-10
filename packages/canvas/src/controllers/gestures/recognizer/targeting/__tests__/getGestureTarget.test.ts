import { describe, it, expect } from "vitest";

import { getGestureTarget } from "../getGestureTarget";

const makeEl = (
	kind?: string,
	id?: string,
	{ part, action }: { part?: string; action?: string } = {},
): Element => {
	const attrs: Record<string, string | undefined> = {
		"data-kind": kind,
		"data-id": id,
		"data-part": part,
		"data-action": action,
	};
	const el = {
		closest: (selector: string) => {
			if (selector === "[data-kind]" && kind !== undefined) {
				return el;
			}
			if (selector === "[data-part]" && part !== undefined) {
				return el;
			}
			if (selector === "[data-action]" && action !== undefined) {
				return el;
			}
			return null;
		},
		getAttribute: (attr: string) => attrs[attr] ?? null,
	};
	return el as unknown as Element;
};

/**
 * Two elements: the pressed one carries `attribute`, an ancestor carries
 * [data-kind]/[data-id]. `outsideKind` puts the carrier above the kind element
 * instead, which must not be read.
 */
const makeNestedEl = (
	kind: string,
	id: string,
	attribute: "data-part" | "data-action",
	value: string,
	{ outsideKind = false }: { outsideKind?: boolean } = {},
): { carrierEl: Element; kindEl: Element } => {
	const kindEl = {
		getAttribute: (attr: string) =>
			({ "data-kind": kind, "data-id": id })[attr] ?? null,
		contains: (other: Element) => !outsideKind && other === carrierEl,
	} as unknown as Element;
	const carrierEl = {
		closest: (selector: string) =>
			selector === "[data-kind]"
				? kindEl
				: selector === `[${attribute}]`
					? carrierEl
					: null,
		getAttribute: (attr: string) => (attr === attribute ? value : null),
	} as unknown as Element;
	return { carrierEl, kindEl };
};

const makeElNoMatch = (): Element =>
	({
		closest: () => null,
		getAttribute: () => null,
	}) as unknown as Element;

describe("getGestureTarget", () => {
	it("returns null when there is no element with [data-kind]", () => {
		expect(getGestureTarget(makeElNoMatch())).toBeNull();
	});

	it("returns null when [data-kind] is present but data-id is missing", () => {
		const el = makeEl("rect", undefined);
		expect(getGestureTarget(el)).toBeNull();
	});

	it("returns { kind, id } when both [data-kind] and data-id are present", () => {
		const el = makeEl("rect", "obj-1");
		expect(getGestureTarget(el)).toEqual({ kind: "rect", id: "obj-1" });
	});

	it("returns the correct values when kind='control' and id='ctrl-2'", () => {
		const el = makeEl("control", "ctrl-2");
		expect(getGestureTarget(el)).toEqual({ kind: "control", id: "ctrl-2" });
	});

	it("returns action when the element also carries data-action", () => {
		const el = makeEl("connector", "c-1", { action: "label" });
		expect(getGestureTarget(el)).toEqual({
			kind: "connector",
			id: "c-1",
			action: "label",
		});
	});

	it("returns part when the element also carries data-part", () => {
		const el = makeEl("object", "obj-1", { part: "textSlot:body" });
		expect(getGestureTarget(el)).toEqual({
			kind: "object",
			id: "obj-1",
			part: "textSlot:body",
		});
	});

	it("reads data-part from a descendant of the [data-kind] element", () => {
		// A compartmented shape (record) keeps data-kind on a single element and puts
		// data-part on the per-compartment hit element.
		const { carrierEl } = makeNestedEl(
			"object",
			"obj-1",
			"data-part",
			"textSlot:rows",
		);
		expect(getGestureTarget(carrierEl)).toEqual({
			kind: "object",
			id: "obj-1",
			part: "textSlot:rows",
		});
	});

	it("reads data-action from a descendant of the [data-kind] element", () => {
		const { carrierEl } = makeNestedEl(
			"menu",
			"toolbar",
			"data-action",
			"command:zoomIn",
		);
		expect(getGestureTarget(carrierEl)).toEqual({
			kind: "menu",
			id: "toolbar",
			action: "command:zoomIn",
		});
	});

	it("ignores a data-part that sits outside the [data-kind] element", () => {
		const { carrierEl } = makeNestedEl(
			"object",
			"obj-1",
			"data-part",
			"textSlot:rows",
			{ outsideKind: true },
		);
		expect(getGestureTarget(carrierEl)).toEqual({
			kind: "object",
			id: "obj-1",
		});
	});

	it("ignores a data-action that sits outside the [data-kind] element", () => {
		const { carrierEl } = makeNestedEl(
			"menu",
			"toolbar",
			"data-action",
			"command:zoomIn",
			{ outsideKind: true },
		);
		expect(getGestureTarget(carrierEl)).toEqual({
			kind: "menu",
			id: "toolbar",
		});
	});
});
