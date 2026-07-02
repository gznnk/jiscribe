import { describe, it, expect } from "vitest";

import type { CanvasState } from "../../../../../../states/canvas/CanvasState";
import { hasSelectedDescendants } from "../hasSelectedDescendants";

const makeState = (objects: Record<string, unknown>): CanvasState =>
	({ objects }) as unknown as CanvasState;

describe("hasSelectedDescendants", () => {
	it("returns false when childIds is empty", () => {
		expect(hasSelectedDescendants(makeState({}), [], new Set(["sel"]))).toBe(
			false,
		);
	});

	describe("direct children", () => {
		it("returns true when a direct child is selected", () => {
			const state = makeState({ child: { type: "rect" } });
			expect(hasSelectedDescendants(state, ["child"], new Set(["child"]))).toBe(
				true,
			);
		});

		it("returns false when no direct child is selected", () => {
			const state = makeState({ child: { type: "rect" } });
			expect(hasSelectedDescendants(state, ["child"], new Set(["other"]))).toBe(
				false,
			);
		});
	});

	describe("nesting (grandchildren)", () => {
		it("returns true when a grandchild is selected", () => {
			const state = makeState({
				group: { type: "group", childIds: ["grandchild"] },
				grandchild: { type: "rect" },
			});
			expect(
				hasSelectedDescendants(state, ["group"], new Set(["grandchild"])),
			).toBe(true);
		});

		it("returns false when no grandchild is selected", () => {
			const state = makeState({
				group: { type: "group", childIds: ["grandchild"] },
				grandchild: { type: "rect" },
			});
			expect(
				hasSelectedDescendants(state, ["group"], new Set(["unrelated"])),
			).toBe(false);
		});

		it("returns true when a deeply nested descendant is selected", () => {
			const state = makeState({
				g1: { type: "group", childIds: ["g2"] },
				g2: { type: "group", childIds: ["deep"] },
				deep: { type: "rect" },
			});
			expect(hasSelectedDescendants(state, ["g1"], new Set(["deep"]))).toBe(
				true,
			);
		});
	});

	describe("multiple childIds", () => {
		it("returns true if at least one child is selected", () => {
			const state = makeState({
				a: { type: "rect" },
				b: { type: "rect" },
				c: { type: "rect" },
			});
			expect(
				hasSelectedDescendants(state, ["a", "b", "c"], new Set(["b"])),
			).toBe(true);
		});

		it("returns false if no child is selected", () => {
			const state = makeState({
				a: { type: "rect" },
				b: { type: "rect" },
			});
			expect(
				hasSelectedDescendants(state, ["a", "b"], new Set(["x", "y"])),
			).toBe(false);
		});
	});
});
