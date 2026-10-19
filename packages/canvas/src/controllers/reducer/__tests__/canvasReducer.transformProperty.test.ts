import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import type { Point, TransformedFrame } from "@jiscribe/geometry";
import { calcFrameKeyPoints } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { createTestState } from "./support/createTestState";
import { rectDoc, twoRectsDoc } from "./support/fixtures";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { selectionOf } from "../../selection/__tests__/support/selectionOf";
import { collectCowChangedKeys, isCowObjects } from "../../utils/cowObjects";
import { updateGroupBounds } from "../../utils/updateGroupBounds";
import type { TransformProperty } from "../CanvasActions";
import { createCanvasReducer } from "../canvasReducer";
import { handleTransformPropertyUpdate } from "../handlers/handleTransformPropertyUpdate";

const registries = createTestRegistries();
const canvasReducer = createCanvasReducer(registries);

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
	const state = createTestState(twoRectsDoc, {
		selection: selectionOf(["rect-1"]),
	});
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
		createTestState(twoRectsDoc, {
			selection: selectionOf(["rect-1", "rect-2"]),
		}),
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
			const groupId = grouped.selection.objectIds[0];
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

	describe("a shape inside nested groups", () => {
		/** rect-1 selected inside `inner`, which sits in `outer` beside rect-3. */
		const nestedState = (): CanvasControllerState =>
			createTestState(nestedGroupsDoc, { selection: selectionOf(["rect-1"]) });

		/** The frame each group would get re-derived from scratch off its children. */
		const expectGroupsSettled = (state: CanvasControllerState) => {
			for (const groupId of ["inner", "outer"]) {
				const derivedFrame = updateGroupBounds(
					state.objects,
					groupId,
				) as unknown as FrameFields;
				const storedFrame = frameOf(state, groupId);
				expect(storedFrame.cx).toBeCloseTo(derivedFrame.cx);
				expect(storedFrame.cy).toBeCloseTo(derivedFrame.cy);
				expect(storedFrame.width).toBeCloseTo(derivedFrame.width);
				expect(storedFrame.height).toBeCloseTo(derivedFrame.height);
			}
		};

		it("refits both groups around a shape moved out past their left edge", () => {
			for (const commit of [false, true]) {
				const next = update(nestedState(), "x", -20, { commit });

				// inner now spans -20..50, outer -20..110.
				expect(frameOf(next, "inner").width).toBeCloseTo(70);
				expect(frameOf(next, "inner").cx).toBeCloseTo(15);
				expect(frameOf(next, "outer").width).toBeCloseTo(130);
				expect(frameOf(next, "outer").cx).toBeCloseTo(45);
				expectGroupsSettled(next);
			}
		});

		it("refits both groups around a shape widened past their right edge", () => {
			for (const commit of [false, true]) {
				const next = update(nestedState(), "width", 120, { commit });

				expect(frameOf(next, "inner").width).toBeCloseTo(120);
				expect(frameOf(next, "outer").width).toBeCloseTo(120);
				expect(frameOf(next, "outer").height).toBeCloseTo(110);
				expectGroupsSettled(next);
			}
		});

		it("refits both groups around the corners a rotation swings out", () => {
			for (const commit of [false, true]) {
				const next = update(nestedState(), "rotation", 45, { commit });

				// A 10 x 10 square turned 45 degrees reaches 5 * sqrt(2) from its center.
				const reachedLeft = 5 - 5 * Math.SQRT2;
				expect(frameOf(next, "inner").width).toBeCloseTo(50 - reachedLeft);
				expect(frameOf(next, "outer").width).toBeCloseTo(110 - reachedLeft);
				expectGroupsSettled(next);
			}
		});

		it("keeps the groups settled across a run of previews and the commit", () => {
			let state = nestedState();
			for (let step = 1; step <= 5; step++) {
				state = update(state, "x", -10 * step, { commit: false });
				expectGroupsSettled(state);
			}
			for (let step = 1; step <= 5; step++) {
				state = update(state, "width", 10 + 20 * step, { commit: false });
				expectGroupsSettled(state);
			}
			state = update(state, "width", 110);

			expect(frameOf(state, "inner").width).toBeCloseTo(110);
			expectGroupsSettled(state);
		});

		it("hands back a view written only where the edit and the groups above it landed", () => {
			// The view is what lets the reducer's re-measure scan the written ids
			// alone; flattening it per preview step would cost a full scan each.
			for (const [property, value] of [
				["x", -20],
				["width", 120],
				["rotation", 45],
			] as const) {
				const state = nestedState();
				const next = handleTransformPropertyUpdate(
					state,
					property,
					value,
					registries,
				);

				expect(isCowObjects(next.objects)).toBe(true);
				const changedIds = collectCowChangedKeys(next.objects, state.objects);
				expect(changedIds).not.toBeNull();
				expect([...(changedIds ?? [])].sort()).toEqual(
					["inner", "outer", "rect-1"].sort(),
				);
			}
		});

		it("leaves plain records in the state and in every history snapshot", () => {
			let state = nestedState();
			state = update(state, "x", -20, { commit: false });
			expect(isCowObjects(state.objects)).toBe(false);
			state = update(state, "x", -20);
			state = update(state, "width", 40, { commit: false });
			expect(isCowObjects(state.objects)).toBe(false);
			state = update(state, "width", 40);

			expect(isCowObjects(state.objects)).toBe(false);
			expect(state.history.past).toHaveLength(2);
			for (const snapshot of [...state.history.past, state.history.present]) {
				if (snapshot.source) {
					expect(isCowObjects(snapshot.source.objects)).toBe(false);
				}
			}
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
				selection: selectionOf(["conn-1"]),
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

	describe("the map it hands back", () => {
		it("is a plain record for a preview and a commit alike", () => {
			// The edit writes through a copy-on-write view and this route bypasses
			// handleGesture, so the reducer flattens it (#213).
			for (const commit of [false, true]) {
				const after = update(singleRectState(), "x", 40, { commit });
				expect(topLeftOf(after, "rect-1").x).toBeCloseTo(40);
				expect(isCowObjects(after.objects)).toBe(false);
			}
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
				type: "STYLE_INTENT",
				intent: { kind: "width", value: "60" },
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

/**
 * rect-1 (0..10) and rect-2 (40..50) in `inner`, which sits in `outer` beside
 * rect-3 (100..110 on both axes).
 */
const nestedGroupsDoc: CanvasDoc = {
	version: 1,
	root: [
		{
			id: "outer",
			type: "group",
			children: [
				{
					id: "inner",
					type: "group",
					children: [rectDoc("rect-1", 0, 0), rectDoc("rect-2", 40, 0)],
				},
				rectDoc("rect-3", 100, 100),
			],
		},
	],
} as unknown as CanvasDoc;
