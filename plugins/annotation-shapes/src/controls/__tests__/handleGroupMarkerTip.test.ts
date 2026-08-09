import type { SelectionControlEvent } from "@jiscribe/canvas";
import { describe, expect, it } from "vitest";

import type { BraceState } from "../../state/brace/BraceState";
import type { BracketState } from "../../state/bracket/BracketState";
import { handleGroupMarkerDirection } from "../handleGroupMarkerDirection";
import { handleGroupMarkerTip } from "../handleGroupMarkerTip";

/** A 24x160 left brace centered at (100, 100): local x = [-12, 12], y = [-80, 80]. */
const braceState = (overrides: Partial<BraceState> = {}): BraceState =>
	({
		id: "brace-1",
		type: "brace",
		cx: 100,
		cy: 100,
		width: 24,
		height: 160,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		direction: "left",
		tipPosition: 0.5,
		...overrides,
	}) as BraceState;

/** The same box as a bracket, which carries no tipPosition at all. */
const bracketState = (overrides: Partial<BracketState> = {}): BracketState =>
	({
		id: "bracket-1",
		type: "bracket",
		cx: 100,
		cy: 100,
		width: 24,
		height: 160,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		direction: "left",
		...overrides,
	}) as BracketState;

const dragTo = (x: number, y: number): SelectionControlEvent => ({
	type: "drag",
	start: { x: 88, y: 100 },
	last: { x, y },
	delta: { x: x - 88, y: y - 100 },
	mods: {} as SelectionControlEvent["mods"],
});

const drag = (state: BraceState, x: number, y: number): BraceState =>
	handleGroupMarkerTip({ object: state, startObject: state }, dragTo(x, y));

describe("handleGroupMarkerTip", () => {
	it("moves the tip along the edge it is already on", () => {
		const moved = drag(braceState(), 88, 60);
		expect(moved.direction).toBe("left");
		expect(moved.tipPosition).toBe(0.25);
	});

	it("takes the direction from the dominant axis, not from raw distance", () => {
		// Local (-15, -120): 15px past the left edge but 40px past the top one.
		// Measured against the half extents (12 and 80) the y overshoot is the
		// larger, so the tip goes to the top edge even though the left one is
		// nearer in raw px.
		expect(drag(braceState(), 85, -20).direction).toBe("up");
		// Local (-15, -80) is the same x with a smaller y overshoot: left wins.
		expect(drag(braceState(), 85, 20).direction).toBe("left");
	});

	it("re-projects onto the new edge when the axis flips", () => {
		// x=130 is past the right edge, y=100 is the vertical middle: the pointer
		// is dominated by x, so the tip lands on the right edge at 0.5.
		const moved = drag(braceState(), 130, 100);
		expect(moved.direction).toBe("right");
		expect(moved.tipPosition).toBe(0.5);
	});

	it("clamps a tip dragged past the end of its edge", () => {
		// Far enough left that x stays dominant, so the tip keeps the left edge
		// while the projection runs off both of its ends.
		expect(drag(braceState(), -100, 0).tipPosition).toBe(0);
		expect(drag(braceState(), -100, 200).tipPosition).toBe(1);
	});

	it("keeps the box as it is when the axis flips", () => {
		const start = braceState();
		const moved = drag(start, 100, 200);
		expect(moved.direction).toBe("down");
		expect({ width: moved.width, height: moved.height }).toEqual({
			width: start.width,
			height: start.height,
		});
	});

	it("reads the pointer in the shape's own space when it is rotated", () => {
		// Rotated 90°, the local left edge faces up in world coordinates. A pointer
		// above the center therefore resolves to "left", and the same pointer to
		// the center's left — the unrotated answer — resolves to "down".
		expect(drag(braceState({ rotation: 90 }), 100, 88).direction).toBe("left");
		expect(drag(braceState({ rotation: 90 }), 88, 100).direction).toBe("down");
	});
});

describe("handleGroupMarkerDirection", () => {
	const dragBracket = (x: number, y: number): BracketState => {
		const state = bracketState();
		return handleGroupMarkerDirection(
			{ object: state, startObject: state },
			dragTo(x, y),
		);
	};

	it("re-attaches the marker to the edge the dominant axis picks", () => {
		expect(dragBracket(130, 100).direction).toBe("right");
		expect(dragBracket(100, 200).direction).toBe("down");
	});

	it("writes back no position, so nothing moves along the edge", () => {
		// The same drag that would put a brace's tip a quarter down its edge.
		expect(dragBracket(88, 60)).toEqual(bracketState());
	});
});
