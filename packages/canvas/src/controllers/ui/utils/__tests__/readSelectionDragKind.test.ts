import { describe, expect, it } from "vitest";

import type { DragKind } from "../../../CanvasTypes";
import {
	readSelectionDragKind,
	type SelectionDragKind,
} from "../readSelectionDragKind";

// Keyed by every other kind, so a kind added to DragKind fails typecheck here until it is listed.
const NON_SELECTION_DRAG_KINDS = {
	inert: true,
	pan: true,
	menu: true,
	marquee: true,
	draw: true,
	connector: true,
	stencil: true,
	vertex: true,
	label: true,
	segment: true,
	selectionControl: true,
} satisfies Record<Exclude<DragKind, SelectionDragKind>, true>;

describe("readSelectionDragKind", () => {
	it("is null with no drag", () => {
		expect(readSelectionDragKind(null)).toBeNull();
	});

	it("names a move or a transform drag", () => {
		expect(readSelectionDragKind({ kind: "move" })).toBe("move");
		expect(readSelectionDragKind({ kind: "transform" })).toBe("transform");
	});

	it("is null for any other drag, whose controls stay up", () => {
		for (const kind of Object.keys(NON_SELECTION_DRAG_KINDS) as DragKind[]) {
			expect(readSelectionDragKind({ kind })).toBeNull();
		}
	});
});
