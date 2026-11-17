import { describe, expect, it } from "vitest";

import type { MovePreview } from "../../../rendering/layers/content/MovePreview";
import { readLabelBackdropDrag } from "../readLabelBackdropDrag";

const visibleIds: ReadonlySet<string> = new Set(["shape"]);
const movePreview = {
	delta: { x: 6, y: 0 },
	translatedIds: new Set(["shape"]),
} as unknown as MovePreview;

describe("readLabelBackdropDrag", () => {
	it("answers no drag while none is under way", () => {
		expect(readLabelBackdropDrag(null, undefined, visibleIds)).toBeNull();
	});

	it("counts an inert drag as none, since it moves nothing", () => {
		expect(
			readLabelBackdropDrag({ kind: "inert" }, undefined, visibleIds),
		).toBeNull();
	});

	it("hands a move drag's preview and the visible ids on", () => {
		const drag = readLabelBackdropDrag(
			{ kind: "move" },
			movePreview,
			visibleIds,
		);
		expect(drag?.movePreview).toBe(movePreview);
		expect(drag?.visibleIds).toBe(visibleIds);
	});

	it.each(["pan", "marquee", "transform", "menu"] as const)(
		"hands the visible ids on for a %s drag, with no preview",
		(kind) => {
			expect(readLabelBackdropDrag({ kind }, undefined, visibleIds)).toEqual({
				movePreview: undefined,
				visibleIds,
			});
		},
	);
});
