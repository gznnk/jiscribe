import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { selectionOf } from "../../selection/__tests__/support/selectionOf";
import type { CanvasAction } from "../CanvasActions";
import { createCanvasReducer } from "../canvasReducer";
import { createTestState } from "./support/createTestState";

const reducer = createCanvasReducer(createTestRegistries());

/** A drag frame on `targetId`, `dx` along x from where it started; Ctrl keeps snapping out of it. */
const dragAction = (
	type: "dragStart" | "drag",
	targetId: string,
	dx: number,
): CanvasAction =>
	({
		type: "GESTURE",
		gesture: {
			type,
			button: 0,
			targetKind: "object",
			targetId,
			start: { x: 100, y: 60 },
			last: { x: 100 + dx, y: 60 },
			clientLast: { x: 100 + dx, y: 60 },
			delta: { x: dx, y: 0 },
			clientDelta: { x: dx, y: 0 },
			mods: { shift: false, alt: false, ctrl: true, meta: false },
		},
	}) as unknown as CanvasAction;

/** The preview a move drag carries; undefined during any other drag, or none. */
const movePreviewOf = (state: CanvasControllerState) =>
	state.drag?.kind === "move" ? state.drag.movePreview : undefined;

/** The state ObjectsRenderer draws `id` from: the start state while the preview shifts it. */
const drawnStateOf = (
	state: CanvasControllerState,
	id: string,
): ObjectState => {
	const movePreview = movePreviewOf(state);
	const startState = movePreview?.startObjects[id];
	return movePreview?.translatedIds.has(id) &&
		startState !== undefined &&
		startState !== state.objects[id]
		? startState
		: state.objects[id];
};

type Box = { cx: number; cy: number; width: number; height: number };

/** Where `state` puts the box of `id`, and where it is drawn (the start box shifted by the delta). */
const boxesOf = (state: CanvasControllerState, id: string) => {
	const live = state.objects[id] as unknown as Box;
	const drawn = drawnStateOf(state, id) as unknown as Box;
	const shift =
		drawn === live
			? { x: 0, y: 0 }
			: (movePreviewOf(state)?.delta ?? { x: 0, y: 0 });
	return {
		live: { cx: live.cx, cy: live.cy, width: live.width, height: live.height },
		drawn: {
			cx: drawn.cx + shift.x,
			cy: drawn.cy + shift.y,
			width: drawn.width,
			height: drawn.height,
		},
	};
};

describe("canvasReducer - move preview", () => {
	it("keeps every moved id on an ordinary drag frame", () => {
		const state = createTestState(
			{
				version: 1,
				root: [
					{ id: "rect-1", type: "rect", x: 0, y: 0, width: 40, height: 40 },
					{ id: "rect-2", type: "rect", x: 80, y: 0, width: 40, height: 40 },
				],
			} as unknown as CanvasDoc,
			{ selection: selectionOf(["rect-1", "rect-2"]) },
		);

		const started = reducer(state, dragAction("dragStart", "rect-1", 10));
		const dragged = reducer(started, dragAction("drag", "rect-1", 25));

		expect([...(movePreviewOf(dragged)?.translatedIds ?? [])]).toEqual([
			"rect-1",
			"rect-2",
		]);
		expect(boxesOf(dragged, "rect-1").drawn).toEqual(
			boxesOf(dragged, "rect-1").live,
		);
	});

	it("draws a box re-measured mid-drag from the state, on that frame and every one after", () => {
		const base = createTestState(
			{
				version: 1,
				root: [
					{
						id: "text-1",
						type: "text",
						x: 100,
						y: 60,
						text: "hello world",
						fontSize: 16,
					},
				],
			} as unknown as CanvasDoc,
			{ selection: selectionOf(["text-1"]) },
		);
		// The box as a fallback face measured it, before the document's face loaded.
		const measured = base.objects["text-1"] as unknown as Box & ObjectState;
		const state = {
			...base,
			objects: {
				...base.objects,
				"text-1": {
					...measured,
					width: 1,
					height: 1,
					cx: measured.cx - measured.width / 2 + 0.5,
					cy: measured.cy - measured.height / 2 + 0.5,
				} as ObjectState,
			},
		};

		const started = reducer(state, dragAction("dragStart", "text-1", 10));
		const dragged = reducer(started, dragAction("drag", "text-1", 20));
		expect(movePreviewOf(dragged)?.translatedIds.has("text-1")).toBe(true);

		// The pointer may hold still after the font lands, so this very frame has
		// to draw the re-measured box.
		const remeasured = reducer(dragged, { type: "REMEASURE_TEXT" });
		expect(movePreviewOf(remeasured)?.translatedIds.has("text-1")).toBe(false);
		expect(boxesOf(remeasured, "text-1").live.width).toBeGreaterThan(1);
		expect(boxesOf(remeasured, "text-1").drawn).toEqual(
			boxesOf(remeasured, "text-1").live,
		);

		const draggedOn = reducer(remeasured, dragAction("drag", "text-1", 30));
		expect(movePreviewOf(draggedOn)?.translatedIds.has("text-1")).toBe(false);
		const { live, drawn } = boxesOf(draggedOn, "text-1");
		expect(live.width).toBeGreaterThan(1);
		expect(drawn).toEqual(live);
	});
});
