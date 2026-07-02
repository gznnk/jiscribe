import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { getHoveredElements } from "../getHoveredElements";

const makeEl = (kind?: string, id?: string): Element => {
	const attrs: Record<string, string | undefined> = {
		"data-kind": kind,
		"data-id": id,
	};
	const el: Partial<Element> = {
		closest: (selector: string) => {
			if (selector === "[data-kind]" && kind !== undefined) {
				return el as Element;
			}
			return null;
		},
		getAttribute: (attr: string) => attrs[attr] ?? null,
	};
	return el as Element;
};

const makeRoot = (...children: Element[]): Element => {
	const root: Partial<Element> = {
		contains: (el: Element) => children.includes(el),
	};
	return root as Element;
};

let mockElementsFromPoint: ReturnType<typeof vi.fn>;

beforeEach(() => {
	mockElementsFromPoint = vi.fn().mockReturnValue([]);
	// document does not exist in the node environment, so inject it into globalThis
	vi.stubGlobal("document", { elementsFromPoint: mockElementsFromPoint });
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("getHoveredElements", () => {
	it("returns elements that have data-kind/data-id", () => {
		const el = makeEl("rect", "obj-1");
		mockElementsFromPoint.mockReturnValue([el]);

		expect(getHoveredElements(0, 0)).toEqual([{ kind: "rect", id: "obj-1" }]);
	});

	it("skips elements that lack data-kind/data-id", () => {
		const noAttrs = makeEl(undefined, undefined);
		mockElementsFromPoint.mockReturnValue([noAttrs]);

		expect(getHoveredElements(0, 0)).toEqual([]);
	});

	it("skips elements with kind='canvas'", () => {
		const canvasEl = makeEl("canvas", "canvas");
		mockElementsFromPoint.mockReturnValue([canvasEl]);

		expect(getHoveredElements(0, 0)).toEqual([]);
	});

	it("returns only the first element when multiple share the same id", () => {
		const el1 = makeEl("rect", "dup");
		const el2 = makeEl("rect", "dup");
		mockElementsFromPoint.mockReturnValue([el1, el2]);

		expect(getHoveredElements(0, 0)).toHaveLength(1);
	});

	it("excludes elements whose id matches excludeId", () => {
		const el = makeEl("rect", "obj-1");
		mockElementsFromPoint.mockReturnValue([el]);

		expect(getHoveredElements(0, 0, "obj-1")).toEqual([]);
	});

	it("excludes elements outside the canvas when rootElement is passed", () => {
		const inside = makeEl("rect", "inside");
		const outside = makeEl("rect", "outside");
		const root = makeRoot(inside);
		mockElementsFromPoint.mockReturnValue([inside, outside]);

		expect(getHoveredElements(0, 0, undefined, root)).toEqual([
			{ kind: "rect", id: "inside" },
		]);
	});

	it("targets all elements when rootElement is null", () => {
		const el = makeEl("rect", "obj-1");
		mockElementsFromPoint.mockReturnValue([el]);

		expect(getHoveredElements(0, 0, undefined, null)).toEqual([
			{ kind: "rect", id: "obj-1" },
		]);
	});
});
