import { describe, it, expect } from "vitest";

import type { CanvasControllerState } from "../../CanvasTypes";
import { isArrangeableSelection } from "../isArrangeableSelection";

const makeState = (
	selectedIds: string[],
	objects: Record<string, { parentId?: string; type?: string }>,
	selectedConnectorId: string | null = null,
): CanvasControllerState =>
	({
		selectedIds,
		objects,
		selectedConnectorId,
	}) as unknown as CanvasControllerState;

describe("isArrangeableSelection", () => {
	it("returns false when nothing is selected", () => {
		expect(isArrangeableSelection(makeState([], {}))).toBe(false);
	});

	describe("object selection (selectedIds)", () => {
		it("a single root is true", () => {
			expect(isArrangeableSelection(makeState(["a"], { a: {} }))).toBe(true);
		});

		it("multiple roots is true", () => {
			expect(
				isArrangeableSelection(makeState(["a", "b"], { a: {}, b: {} })),
			).toBe(true);
		});

		it("multiple items within the same group is true", () => {
			const state = makeState(["c1", "c2"], {
				c1: { parentId: "g" },
				c2: { parentId: "g" },
			});
			expect(isArrangeableSelection(state)).toBe(true);
		});

		it("spanning different groups is false", () => {
			const state = makeState(["c1", "c2"], {
				c1: { parentId: "g1" },
				c2: { parentId: "g2" },
			});
			expect(isArrangeableSelection(state)).toBe(false);
		});

		it("mixing root and in-group items is false", () => {
			const state = makeState(["r", "c"], {
				r: {},
				c: { parentId: "g" },
			});
			expect(isArrangeableSelection(state)).toBe(false);
		});
	});

	describe("connector selection (selectedConnectorId)", () => {
		it("a single connector selection is true (the condition for showing StackOrder)", () => {
			const state = makeState([], { conn: { type: "connector" } }, "conn");
			expect(isArrangeableSelection(state)).toBe(true);
		});
	});
});
