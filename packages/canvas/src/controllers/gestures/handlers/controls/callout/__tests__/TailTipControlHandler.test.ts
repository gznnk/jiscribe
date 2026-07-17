import { describe, expect, it } from "vitest";

import type { CalloutState } from "../../../../../../states/objects/annotations/callout/CalloutState";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import type { CanvasEvent } from "../../../../registry/GestureHandlerTypes";
import { TailTipControlHandler } from "../TailTipControlHandler";

const handler = new TailTipControlHandler();

/** Callout of 200x160 centered at (100, 100): edges x=[0,200], y=[20,180]. */
const makeCallout = (overrides: Partial<CalloutState> = {}): CalloutState =>
	({
		id: "callout-1",
		type: "callout",
		cx: 100,
		cy: 100,
		width: 200,
		height: 160,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		...overrides,
	}) as unknown as CalloutState;

const makeDragState = (callout: CalloutState): CanvasControllerState =>
	({
		objects: { "callout-1": callout },
		rootIds: ["callout-1"],
		selectedIds: ["callout-1"],
		viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
		eventStartSnapshot: {
			objects: { "callout-1": callout },
			keyPoints: {},
			snapCandidates: null,
			selectedIds: ["callout-1"],
			selectedIdsWithDescendants: new Set(["callout-1"]),
			multiSelectGroup: null,
			viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
		},
	}) as unknown as CanvasControllerState;

const makeDragEvent = (
	last: { x: number; y: number },
	type: "drag" | "dragEnd" = "drag",
): CanvasEvent =>
	({
		type,
		targetKind: "control",
		targetId: "callout-1",
		targetPart: "selection:callout:tailTip",
		button: 0,
		last,
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

const tailOf = (state: CanvasControllerState) =>
	(state.objects["callout-1"] as CalloutState).tail;

describe("TailTipControlHandler", () => {
	it("supports its own selection-control part (common supports from the base)", () => {
		expect(handler.part).toBe("selection:callout:tailTip");
		expect(handler.supports(makeDragEvent({ x: 0, y: 0 }))).toBe(true);
	});

	it("derives side=right and the edge projection from a rightward drag", () => {
		const next = handler.handle(
			makeDragState(makeCallout()),
			makeDragEvent({ x: 190, y: 100 }),
		);
		expect(tailOf(next)).toEqual({ side: "right", position: 0.5 });
	});

	it("derives side=bottom when the vertical axis dominates", () => {
		const next = handler.handle(
			makeDragState(makeCallout()),
			makeDragEvent({ x: 40, y: 400 }),
		);
		expect(tailOf(next)).toEqual({ side: "bottom", position: 0.2 });
	});

	it("clamps position to [0, 1] when the pointer runs past the edge", () => {
		const next = handler.handle(
			makeDragState(makeCallout()),
			makeDragEvent({ x: 400, y: 300 }),
		);
		expect(tailOf(next)).toEqual({ side: "right", position: 1 });
	});

	it("maps the pointer through the inverse transform for rotated callouts", () => {
		// rotation=90: world (100, 160) -> local (60, 0) -> right at 0.5
		const next = handler.handle(
			makeDragState(makeCallout({ rotation: 90 })),
			makeDragEvent({ x: 100, y: 160 }),
		);
		expect(tailOf(next)).toEqual({ side: "right", position: 0.5 });
	});

	it("dragEnd applies the update and disables edge scrolling", () => {
		const next = handler.handle(
			makeDragState(makeCallout()),
			makeDragEvent({ x: 190, y: 100 }, "dragEnd"),
		);
		expect(tailOf(next)).toEqual({ side: "right", position: 0.5 });
		expect(next.edgeScrollEnabled).toBe(false);
	});

	it("ignores drags for non-callout targets", () => {
		const callout = makeCallout();
		const rectLike = { ...callout, type: "rect" } as unknown as CalloutState;
		const state = makeDragState(rectLike);
		const next = handler.handle(state, makeDragEvent({ x: 190, y: 100 }));
		expect(next).toBe(state);
	});
});
