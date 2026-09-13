import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { createGetHovered, getHoveredElements } from "../getHoveredElements";

const makeEl = (kind?: string, id?: string, part?: string): Element => {
	const attrs: Record<string, string | undefined> = {
		"data-kind": kind,
		"data-id": id,
		"data-part": part,
	};
	const el: Partial<Element> = {
		closest: (selector: string) => {
			if (selector === "[data-kind]" && kind !== undefined) {
				return el as Element;
			}
			if (selector === "[data-part]" && part !== undefined) {
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

	it("excludes the drag origin element (matching id and part)", () => {
		const el = makeEl("rect", "obj-1");
		mockElementsFromPoint.mockReturnValue([el]);

		expect(getHoveredElements(0, 0, { id: "obj-1" })).toEqual([]);
	});

	it("does not exclude an element sharing the origin's id but with a different part (self-loop: dragging from an anchor must still hover the shape itself)", () => {
		const shape = makeEl("object", "obj-1");
		mockElementsFromPoint.mockReturnValue([shape]);

		expect(
			getHoveredElements(0, 0, { id: "obj-1", part: "anchor:rightCenter" }),
		).toEqual([{ kind: "object", id: "obj-1" }]);
	});

	it("still hovers the entity body when an excluded control shares its id (excluded origin must not consume the dedup slot)", () => {
		// Topmost: the drag-origin anchor control (data-id = owner shapeId, excluded).
		// Below it: the shape body itself, sharing the same id but with no part.
		const anchor = makeEl("control", "obj-1", "anchor:rightCenter");
		const shapeBody = makeEl("object", "obj-1");
		mockElementsFromPoint.mockReturnValue([anchor, shapeBody]);

		expect(
			getHoveredElements(0, 0, { id: "obj-1", part: "anchor:rightCenter" }),
		).toEqual([{ kind: "object", id: "obj-1" }]);
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

describe("createGetHovered", () => {
	it("does not hit-test until the getter is first called (lazy)", () => {
		createGetHovered(0, 0);

		expect(mockElementsFromPoint).not.toHaveBeenCalled();
	});

	it("hit-tests only once across repeated calls (memoized)", () => {
		const el = makeEl("rect", "obj-1");
		mockElementsFromPoint.mockReturnValue([el]);
		const getHovered = createGetHovered(0, 0);

		const first = getHovered();
		const second = getHovered();

		expect(first).toEqual([{ kind: "rect", id: "obj-1" }]);
		expect(second).toBe(first);
		expect(mockElementsFromPoint).toHaveBeenCalledTimes(1);
	});

	it("passes exclude / rootElement through to getHoveredElements", () => {
		const inside = makeEl("rect", "inside");
		const origin = makeEl("rect", "origin");
		const outside = makeEl("rect", "outside");
		const root = makeRoot(inside, origin);
		mockElementsFromPoint.mockReturnValue([inside, origin, outside]);
		const getHovered = createGetHovered(0, 0, { id: "origin" }, root);

		expect(getHovered()).toEqual([{ kind: "rect", id: "inside" }]);
	});
});
