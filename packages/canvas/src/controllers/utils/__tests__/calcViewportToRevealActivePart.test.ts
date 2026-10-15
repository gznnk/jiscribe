import type { Rect } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import type { ObjectPartKindRegistry } from "../../../rendering/objects/registry/ObjectPartKindRegistry";
import type { Viewport } from "../../../rendering/Viewport";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { selectionOf } from "../../selection/__tests__/support/selectionOf";
import type { ObjectPartSelection } from "../../selection/CanvasSelection";
import { calcViewportToRevealActivePart } from "../calcViewportToRevealActivePart";

/** Visible world rect (0, 0)-(800, 600) at zoom 1. */
const viewport: Viewport = {
	minX: 0,
	minY: 0,
	width: 800,
	height: 600,
	zoom: 1,
};

/** A strip centred at (400, 300) whose cell "n" spans x n*100-50 .. n*100+50 locally. */
const strip = {
	id: "strip",
	type: "strip",
	cx: 400,
	cy: 300,
	width: 2000,
	height: 20,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
} as unknown as ObjectState;

const cellRegion = (partId: string): Rect => ({
	x: Number(partId) * 100 - 50,
	y: -10,
	width: 100,
	height: 20,
});

const registry: Pick<ObjectPartKindRegistry, "get"> = {
	get: (type, kind) =>
		type === "strip" && kind === "cell"
			? {
					kind: "cell",
					has: () => true,
					region: (_object, partId) => cellRegion(partId),
				}
			: undefined,
};

const objects = { strip };

/** A cell pick on the strip whose active range runs from `anchorId` to `focusId`. */
const cellPick = (focusId: string, anchorId = focusId) =>
	selectionOf(["strip"], {
		kind: "cell",
		ranges: [{ anchorId, focusId }],
	} satisfies ObjectPartSelection);

const reveal = (
	previous: ReturnType<typeof selectionOf>,
	next: ReturnType<typeof selectionOf>,
	from: Viewport = viewport,
) => calcViewportToRevealActivePart(from, previous, next, objects, registry);

describe("calcViewportToRevealActivePart", () => {
	it("pans the least that shows a part moved to off screen, with a 24px margin", () => {
		// Cell 6 spans x 950..1050: its right edge plus 24 lands on the view's right.
		expect(reveal(cellPick("5"), cellPick("6"))).toEqual({
			...viewport,
			minX: 274,
		});
	});

	it("returns the same viewport when the part moved to is already in view", () => {
		expect(reveal(cellPick("0"), cellPick("1"))).toBe(viewport);
	});

	it("follows the focus of an extended range, not the whole range", () => {
		// Range 0..6: only cell 6 is revealed, so the pan is the same as above.
		expect(reveal(cellPick("5", "0"), cellPick("6", "0"))).toEqual({
			...viewport,
			minX: 274,
		});
	});

	it("does not pan while the focus stays where it was", () => {
		// The user scrolled away from cell 6; a command leaving the pick alone
		// must not drag the view back.
		expect(reveal(cellPick("6"), cellPick("6"))).toBe(viewport);
	});

	it("reveals a part picked by the command from a whole-object selection", () => {
		expect(reveal(selectionOf(["strip"]), cellPick("6"))).toEqual({
			...viewport,
			minX: 274,
		});
	});

	it("does not pan when no part is picked after the command", () => {
		expect(reveal(cellPick("6"), selectionOf(["strip"]))).toBe(viewport);
	});

	it("does not pan for a kind without a region", () => {
		const vertexPick = selectionOf(["strip"], {
			kind: "vertex",
			ranges: [{ anchorId: "9", focusId: "9" }],
		});

		expect(reveal(selectionOf(["strip"]), vertexPick)).toBe(viewport);
	});

	it("does not move a viewport that has not been measured yet", () => {
		const unmeasured: Viewport = { ...viewport, width: 0, height: 0 };

		expect(reveal(cellPick("5"), cellPick("6"), unmeasured)).toBe(unmeasured);
	});
});
