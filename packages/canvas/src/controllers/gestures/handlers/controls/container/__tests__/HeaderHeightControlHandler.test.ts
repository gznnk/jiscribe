import { describe, expect, it } from "vitest";

import type { ContainerState } from "../../../../../../states/objects/containers/container/ContainerState";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import type { CanvasEvent } from "../../../../registry/GestureHandlerTypes";
import { HeaderHeightControlHandler } from "../HeaderHeightControlHandler";

const handler = new HeaderHeightControlHandler();

/** Container of 200x160 centered at (100, 100): top edge y=20, bottom edge y=180. */
const makeContainer = (
	overrides: Partial<ContainerState> = {},
): ContainerState =>
	({
		id: "container-1",
		type: "container",
		cx: 100,
		cy: 100,
		width: 200,
		height: 160,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		...overrides,
	}) as unknown as ContainerState;

const makeDragState = (container: ContainerState): CanvasControllerState =>
	({
		objects: { "container-1": container },
		rootIds: ["container-1"],
		selectedIds: ["container-1"],
		viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
		eventStartSnapshot: {
			objects: { "container-1": container },
			keyPoints: {},
			snapCandidates: null,
			selectedIds: ["container-1"],
			selectedIdsWithDescendants: new Set(["container-1"]),
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
		targetId: "container-1",
		targetPart: "selection:container:headerHeight",
		button: 0,
		last,
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

const headerHeightOf = (state: CanvasControllerState): number | undefined =>
	(state.objects["container-1"] as ContainerState).headerHeight;

describe("HeaderHeightControlHandler", () => {
	it("supports only its own selection-control part (common supports from the base)", () => {
		expect(handler.part).toBe("selection:container:headerHeight");
		expect(handler.supports(makeDragEvent({ x: 0, y: 0 }))).toBe(true);
		expect(
			handler.supports({
				targetKind: "control",
				targetPart: "resize:topLeft",
			} as unknown as CanvasEvent),
		).toBe(false);
		expect(
			handler.supports({
				targetKind: "object",
				targetPart: "selection:container:headerHeight",
			} as unknown as CanvasEvent),
		).toBe(false);
	});

	it("derives headerHeight from the cursor's distance to the top edge", () => {
		const next = handler.handle(
			makeDragState(makeContainer()),
			makeDragEvent({ x: 100, y: 60 }),
		);
		expect(headerHeightOf(next)).toBe(40);
	});

	it("clamps to the minimum header height", () => {
		const next = handler.handle(
			makeDragState(makeContainer()),
			makeDragEvent({ x: 100, y: 22 }),
		);
		expect(headerHeightOf(next)).toBe(16);
	});

	it("clamps to the container height", () => {
		const next = handler.handle(
			makeDragState(makeContainer()),
			makeDragEvent({ x: 100, y: 500 }),
		);
		expect(headerHeightOf(next)).toBe(160);
	});

	it("never persists below 1 even when the container height is sub-pixel", () => {
		// height 0.5 -> the height-side clamp would give 0.5, which the doc
		// validator (min 1) rejects; the persisted value floors at 1
		const next = handler.handle(
			makeDragState(makeContainer({ height: 0.5 })),
			makeDragEvent({ x: 100, y: 100 }),
		);
		expect(headerHeightOf(next)).toBe(1);
	});

	it("maps the cursor through the inverse transform for rotated containers", () => {
		// rotation=90: local (0, ly) maps to world (cx - ly, cy);
		// cursor (140, 100) -> ly = -40 -> headerHeight = -40 + 160/2 = 40
		const next = handler.handle(
			makeDragState(makeContainer({ rotation: 90 })),
			makeDragEvent({ x: 140, y: 100 }),
		);
		expect(headerHeightOf(next)).toBe(40);
	});

	it("does not mutate the input state (returns an updated copy)", () => {
		const state = makeDragState(makeContainer());
		const next = handler.handle(state, makeDragEvent({ x: 100, y: 60 }));
		expect(headerHeightOf(state)).toBeUndefined();
		expect(next).not.toBe(state);
	});

	it("dragEnd applies the update and disables edge scrolling", () => {
		const next = handler.handle(
			makeDragState(makeContainer()),
			makeDragEvent({ x: 100, y: 60 }, "dragEnd"),
		);
		expect(headerHeightOf(next)).toBe(40);
		expect(next.edgeScrollEnabled).toBe(false);
	});

	it("ignores drags for non-container targets", () => {
		const container = makeContainer();
		const rectLike = {
			...container,
			type: "rect",
		} as unknown as ContainerState;
		const state = makeDragState(rectLike);
		const next = handler.handle(state, makeDragEvent({ x: 100, y: 60 }));
		expect(next).toBe(state);
	});
});
