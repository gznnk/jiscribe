import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import type { Point, TransformedFrame } from "@jiscribe/geometry";
import { calcFrameKeyPoints } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { createTestState } from "./support/createTestState";
import { rectDoc, twoRectsDoc } from "./support/fixtures";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import type { TransformProperty } from "../CanvasActions";
import { createCanvasReducer } from "../canvasReducer";

const canvasReducer = createCanvasReducer(createTestRegistries());

/** The frame fields the assertions read, which ObjectState leaves to the shape types. */
type FrameFields = {
	cx: number;
	cy: number;
	width: number;
	height: number;
	rotation: number;
	scaleX: number;
	autoHeight?: boolean;
};

const frameOf = (state: CanvasControllerState, id: string): FrameFields =>
	state.objects[id] as unknown as FrameFields;

/** The corner a resize is anchored at, and the point the `x` / `y` fields name. */
const topLeftOf = (state: CanvasControllerState, id: string): Point =>
	calcFrameKeyPoints(state.objects[id] as unknown as TransformedFrame).topLeft;

const update = (
	state: CanvasControllerState,
	property: TransformProperty,
	value: number,
	options: { commit?: boolean; coalesceHistory?: boolean } = {},
): CanvasControllerState =>
	canvasReducer(state, {
		type: "TRANSFORM_PROPERTY_UPDATE",
		property,
		value,
		commit: options.commit ?? true,
		coalesceHistory: options.coalesceHistory,
	});

/** rect-1 selected on its own: x 0..10, y 0..10, so cx = cy = 5. */
const singleRectState = (
	objectOverrides: Partial<Record<string, unknown>> = {},
): CanvasControllerState => {
	const state = createTestState(twoRectsDoc, { selectedIds: ["rect-1"] });
	if (Object.keys(objectOverrides).length === 0) {
		return state;
	}
	return {
		...state,
		objects: {
			...state.objects,
			"rect-1": {
				...state.objects["rect-1"],
				...objectOverrides,
			} as ObjectState,
		},
	};
};

/** Both rects selected, so the reducer builds the multiSelectGroup the handles show. */
const multiSelectState = (): CanvasControllerState =>
	canvasReducer(createTestState(twoRectsDoc), {
		type: "SET_SELECTION",
		ids: ["rect-1", "rect-2"],
	});

/** The two rects wrapped in one group, that group selected. */
const groupedState = (): CanvasControllerState => {
	const grouped = canvasReducer(
		createTestState(twoRectsDoc, { selectedIds: ["rect-1", "rect-2"] }),
		{ type: "COMMAND", commandId: "group" },
	);
	return grouped;
};

describe("canvasReducer / TRANSFORM_PROPERTY_UPDATE", () => {
	describe("a single object's frame", () => {
		it("moves the object so its top-left lands on the stated x", () => {
			const next = update(singleRectState(), "x", 40);

			expect(frameOf(next, "rect-1").cx).toBe(45);
			expect(frameOf(next, "rect-1").cy).toBe(5);
		});

		it("moves it on y the same way, leaving the size alone", () => {
			const next = update(singleRectState(), "y", -20);

			expect(frameOf(next, "rect-1").cy).toBe(-15);
			expect(frameOf(next, "rect-1").height).toBe(10);
		});

		it("resizes the width about the top-left corner", () => {
			const next = update(singleRectState(), "width", 30);

			expect(frameOf(next, "rect-1").width).toBe(30);
			// Top-left held at (0, 0): the right edge alone moved out to 30.
			expect(frameOf(next, "rect-1").cx).toBe(15);
			expect(frameOf(next, "rect-1").cy).toBe(5);
			expect(frameOf(next, "rect-1").height).toBe(10);
		});

		it("resizes the height about the top-left corner", () => {
			const next = update(singleRectState(), "height", 50);

			expect(frameOf(next, "rect-1").height).toBe(50);
			expect(frameOf(next, "rect-1").cy).toBe(25);
			expect(frameOf(next, "rect-1").width).toBe(10);
		});

		it("turns the object to the stated angle", () => {
			const next = update(singleRectState(), "rotation", 30);

			expect(frameOf(next, "rect-1").rotation).toBe(30);
			// A rotation is about the center, which stays where it was.
			expect(frameOf(next, "rect-1").cx).toBe(5);
			expect(frameOf(next, "rect-1").cy).toBe(5);
		});

		it("wraps an angle outside 0-360 into range", () => {
			expect(
				frameOf(update(singleRectState(), "rotation", 400), "rect-1").rotation,
			).toBe(40);
			expect(
				frameOf(update(singleRectState(), "rotation", -90), "rect-1").rotation,
			).toBe(270);
		});

		it("keeps the top-left fixed when the object is rotated", () => {
			const rotated = singleRectState({ rotation: 90 });
			const topLeftBefore = topLeftOf(rotated, "rect-1");

			const next = update(rotated, "width", 30);

			expect(frameOf(next, "rect-1").width).toBe(30);
			// The corner the handles call top-left is fixed whatever the angle: a
			// 90°-turned frame widens downward in world space.
			const topLeftAfter = topLeftOf(next, "rect-1");
			expect(topLeftAfter.x).toBeCloseTo(topLeftBefore.x, 9);
			expect(topLeftAfter.y).toBeCloseTo(topLeftBefore.y, 9);
		});

		it("leaves a mirrored object mirrored when it is resized", () => {
			const mirrored = singleRectState({ scaleX: -1 });
			const topLeftBefore = topLeftOf(mirrored, "rect-1");

			const next = update(mirrored, "width", 30);

			expect(frameOf(next, "rect-1").width).toBe(30);
			expect(frameOf(next, "rect-1").scaleX).toBe(-1);
			expect(topLeftOf(next, "rect-1").x).toBeCloseTo(topLeftBefore.x, 9);
		});
	});

	describe("the constraints a resize drag obeys", () => {
		it("carries the other axis along when the aspect ratio is locked", () => {
			const locked = singleRectState({ lockAspectRatio: true });

			const next = update(locked, "width", 40);

			expect(frameOf(next, "rect-1").width).toBe(40);
			expect(frameOf(next, "rect-1").height).toBe(40);
		});

		it("holds the other axis still when it is not", () => {
			const next = update(singleRectState(), "width", 40);

			expect(frameOf(next, "rect-1").height).toBe(10);
		});

		it("floors a width below minWidth at the minimum", () => {
			const constrained = singleRectState({ minWidth: 25 });

			const next = update(constrained, "width", 4);

			expect(frameOf(next, "rect-1").width).toBe(25);
		});

		it("floors a height below minHeight at the minimum", () => {
			const constrained = singleRectState({ minHeight: 25 });

			const next = update(constrained, "height", 4);

			expect(frameOf(next, "rect-1").height).toBe(25);
		});

		it("stops a stated height from following the text any longer", () => {
			const following = singleRectState({ autoHeight: true });

			const next = update(following, "height", 40);

			expect(frameOf(next, "rect-1").autoHeight).toBeUndefined();
			expect(frameOf(next, "rect-1").height).toBe(40);
		});

		it("leaves a height that follows the text alone on a width edit", () => {
			const following = singleRectState({ autoHeight: true });

			const next = update(following, "width", 40);

			expect(frameOf(next, "rect-1").autoHeight).toBe(true);
		});
	});

	describe("a group's frame", () => {
		it("scales the children when the group is widened", () => {
			const grouped = groupedState();
			const groupId = grouped.selectedIds[0];
			expect(frameOf(grouped, groupId).width).toBe(110);

			const next = update(grouped, "width", 220);

			// Doubling about the top-left doubles every child's offset and width.
			expect(frameOf(next, "rect-1").cx).toBe(10);
			expect(frameOf(next, "rect-1").width).toBe(20);
			expect(frameOf(next, "rect-2").cx).toBe(210);
			expect(frameOf(next, "rect-2").width).toBe(20);
			// The group's own frame is re-derived from the children it just scaled.
			expect(frameOf(next, groupId).width).toBe(220);
			expect(frameOf(next, groupId).height).toBe(110);
		});

		it("moves the children as a tree when the group is moved", () => {
			const grouped = groupedState();

			const next = update(grouped, "x", 10);

			expect(frameOf(next, "rect-1").cx).toBe(15);
			expect(frameOf(next, "rect-2").cx).toBe(115);
		});
	});

	describe("a multi-selection's frame", () => {
		it("moves every selected object by the same delta", () => {
			const state = multiSelectState();

			const next = update(state, "x", 25);

			expect(frameOf(next, "rect-1").cx).toBe(30);
			expect(frameOf(next, "rect-2").cx).toBe(130);
			expect(next.multiSelectGroup?.cx).toBe(80);
		});

		it("turns the multiSelectGroup, carrying the selection with it", () => {
			const state = multiSelectState();

			const next = update(state, "rotation", 90);

			expect(next.multiSelectGroup?.rotation).toBe(90);
			expect(frameOf(next, "rect-1").rotation).toBe(90);
			expect(frameOf(next, "rect-2").rotation).toBe(90);
		});
	});

	describe("the edits that change nothing", () => {
		const expectNoOp = (
			state: CanvasControllerState,
			property: TransformProperty,
			value: number,
		) => {
			expect(update(state, property, value)).toBe(state);
		};

		it("leaves the state alone with nothing selected", () => {
			expectNoOp(createTestState(twoRectsDoc), "x", 40);
		});

		it("leaves it alone for a connector-only selection", () => {
			const connectorSelected = createTestState(connectorDoc, {
				selectedConnectorId: "conn-1",
			});

			expectNoOp(connectorSelected, "width", 40);
		});

		it("leaves a preview of the value the frame already has alone", () => {
			for (const [property, value] of [
				["x", 0],
				["width", 10],
				["rotation", 0],
			] as const) {
				const state = singleRectState();
				expect(update(state, property, value, { commit: false })).toBe(state);
			}
		});

		it("leaves it alone for a non-finite value", () => {
			expectNoOp(singleRectState(), "x", Number.NaN);
			expectNoOp(singleRectState(), "width", Number.POSITIVE_INFINITY);
		});

		it("leaves it alone for a size at or below zero", () => {
			expectNoOp(singleRectState(), "width", 0);
			expectNoOp(singleRectState(), "height", -5);
		});
	});

	describe("history", () => {
		it("records exactly one entry per commit", () => {
			let state = singleRectState();

			state = update(state, "x", 40);
			expect(state.history.past).toHaveLength(1);

			state = update(state, "x", 60);
			expect(state.history.past).toHaveLength(2);
		});

		it("records the commit of a value the preview already applied", () => {
			const previewed = update(singleRectState(), "x", 40, { commit: false });
			expect(previewed.history.past).toHaveLength(0);

			// Enter after typing: the frame holds 40 already, and this is the press
			// that makes it an entry.
			const committed = update(previewed, "x", 40);
			expect(committed.history.past).toHaveLength(1);
			expect(committed.commitVersion).toBe(previewed.commitVersion + 1);
			expect(frameOf(committed, "rect-1").cx).toBe(45);

			const undone = canvasReducer(committed, {
				type: "COMMAND",
				commandId: "undo",
			});
			expect(frameOf(undone, "rect-1").cx).toBe(5);
		});

		it("records nothing for a preview", () => {
			const next = update(singleRectState(), "x", 40, { commit: false });

			expect(next.history.past).toHaveLength(0);
			// The preview still draws at the new position.
			expect(frameOf(next, "rect-1").cx).toBe(45);
		});

		it("merges consecutive coalescing commits of the same property", () => {
			let state = singleRectState();

			state = update(state, "x", 40, { coalesceHistory: true });
			expect(state.history.past).toHaveLength(1);

			state = update(state, "x", 41, { coalesceHistory: true });
			state = update(state, "x", 42, { coalesceHistory: true });
			expect(state.history.past).toHaveLength(1);
			expect(frameOf(state, "rect-1").cx).toBe(47);
		});

		it("does not merge across a changed property", () => {
			let state = singleRectState();

			state = update(state, "x", 40, { coalesceHistory: true });
			state = update(state, "y", 40, { coalesceHistory: true });
			expect(state.history.past).toHaveLength(2);
		});

		it("does not merge into a menu commit of the same name", () => {
			let state = singleRectState();

			state = update(state, "width", 40, { coalesceHistory: true });
			expect(state.history.past).toHaveLength(1);

			state = canvasReducer(state, {
				type: "STYLE_PROPERTY_UPDATE",
				property: "width",
				value: "60",
				commit: true,
				coalesceHistory: true,
			});
			expect(state.history.past).toHaveLength(2);
		});

		it("undoes a committed edit in one step", () => {
			let state = singleRectState();

			state = update(state, "width", 40);
			state = canvasReducer(state, { type: "COMMAND", commandId: "undo" });

			expect(frameOf(state, "rect-1").width).toBe(10);
		});
	});
});

/** One rect plus a connector hanging off it, for the connector-only selection. */
const connectorDoc: CanvasDoc = {
	version: 1,
	root: [
		rectDoc("rect-1", 0, 0),
		{
			id: "conn-1",
			type: "connector",
			points: [],
			source: { owner: { id: "rect-1" }, anchor: { kind: "center" } },
			target: { anchor: { kind: "free", point: { x: 50, y: 50 } } },
		},
	],
} as unknown as CanvasDoc;
