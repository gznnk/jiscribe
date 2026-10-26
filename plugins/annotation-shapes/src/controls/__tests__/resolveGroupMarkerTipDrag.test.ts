import type { SelectionControlEvent } from "@jiscribe/canvas";
import { describe, expect, it } from "vitest";

import type { GroupMarkerControlState } from "../../state/shared/GroupMarkerControlState";
import { resolveGroupMarkerTipDrag } from "../resolveGroupMarkerTipDrag";

/** A marker box centered at (100, 100), unrotated, `width` x `height`. */
const markerState = (width: number, height: number): GroupMarkerControlState =>
	({
		id: "brace-1",
		type: "brace",
		cx: 100,
		cy: 100,
		width,
		height,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		direction: "left",
	}) as GroupMarkerControlState;

/** Resolves a drag of the tip to (x, y) on `state`. */
const resolveDragTo = (state: GroupMarkerControlState, x: number, y: number) =>
	resolveGroupMarkerTipDrag(
		{ object: state, startObject: state, selectedPart: null },
		{
			type: "drag",
			start: { x: 100, y: 100 },
			last: { x, y },
			delta: { x: x - 100, y: y - 100 },
			mods: {} as SelectionControlEvent["mods"],
		},
	);

describe("resolveGroupMarkerTipDrag", () => {
	it("faces up or down when the vertical axis dominates, the position read along the width", () => {
		const state = markerState(24, 160);
		expect(resolveDragTo(state, 106, 0)).toEqual({
			direction: "up",
			tipPosition: 0.75,
		});
		expect(resolveDragTo(state, 94, 200)).toEqual({
			direction: "down",
			tipPosition: 0.25,
		});
	});

	it("rounds the position to four decimal places", () => {
		// (5 + 80) / 160 = 0.53125
		expect(resolveDragTo(markerState(24, 160), 300, 105).tipPosition).toBe(
			0.5313,
		);
	});

	it("puts the tip at the middle of an edge of no length rather than dividing by zero", () => {
		// No width: the vertical axis wins on any vertical offset, and the edge it
		// picks has no length to project onto.
		expect(resolveDragTo(markerState(0, 160), 130, 180)).toEqual({
			direction: "down",
			tipPosition: 0.5,
		});
		// No height: the horizontal axis wins, and its edge has no length either.
		expect(resolveDragTo(markerState(24, 0), 60, 140)).toEqual({
			direction: "left",
			tipPosition: 0.5,
		});
	});

	it("faces right for a box with no extent at all, the tip at the middle", () => {
		expect(resolveDragTo(markerState(0, 0), 40, 60)).toEqual({
			direction: "right",
			tipPosition: 0.5,
		});
	});
});
