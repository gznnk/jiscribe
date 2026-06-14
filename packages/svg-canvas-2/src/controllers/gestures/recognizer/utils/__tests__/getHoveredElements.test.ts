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
	// document はノード環境に存在しないため globalThis に差し込む
	vi.stubGlobal("document", { elementsFromPoint: mockElementsFromPoint });
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("getHoveredElements", () => {
	it("data-kind/data-id を持つ要素を返す", () => {
		const el = makeEl("rect", "obj-1");
		mockElementsFromPoint.mockReturnValue([el]);

		expect(getHoveredElements(0, 0)).toEqual([{ kind: "rect", id: "obj-1" }]);
	});

	it("data-kind/data-id を持たない要素はスキップする", () => {
		const noAttrs = makeEl(undefined, undefined);
		mockElementsFromPoint.mockReturnValue([noAttrs]);

		expect(getHoveredElements(0, 0)).toEqual([]);
	});

	it("kind='canvas' の要素はスキップする", () => {
		const canvasEl = makeEl("canvas", "canvas");
		mockElementsFromPoint.mockReturnValue([canvasEl]);

		expect(getHoveredElements(0, 0)).toEqual([]);
	});

	it("同じ id の要素が複数あれば最初の1件のみ返す", () => {
		const el1 = makeEl("rect", "dup");
		const el2 = makeEl("rect", "dup");
		mockElementsFromPoint.mockReturnValue([el1, el2]);

		expect(getHoveredElements(0, 0)).toHaveLength(1);
	});

	it("excludeId と一致する id の要素は除外する", () => {
		const el = makeEl("rect", "obj-1");
		mockElementsFromPoint.mockReturnValue([el]);

		expect(getHoveredElements(0, 0, "obj-1")).toEqual([]);
	});

	it("rootElement を渡すとキャンバス外の要素を除外する", () => {
		const inside = makeEl("rect", "inside");
		const outside = makeEl("rect", "outside");
		const root = makeRoot(inside);
		mockElementsFromPoint.mockReturnValue([inside, outside]);

		expect(getHoveredElements(0, 0, undefined, root)).toEqual([
			{ kind: "rect", id: "inside" },
		]);
	});

	it("rootElement が null のとき全要素を対象にする", () => {
		const el = makeEl("rect", "obj-1");
		mockElementsFromPoint.mockReturnValue([el]);

		expect(getHoveredElements(0, 0, undefined, null)).toEqual([
			{ kind: "rect", id: "obj-1" },
		]);
	});
});
