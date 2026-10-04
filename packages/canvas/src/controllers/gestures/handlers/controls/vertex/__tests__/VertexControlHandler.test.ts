import { calcPolyKeyPoints } from "@jiscribe/geometry";
import type { FrameKeyPoints, Point } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { createTestRegistries } from "../../../../../registries/createCanvasRegistries";
import { VERTEX_PART_KIND } from "../../../../../selection/createVertexPartKindDefinition";
import type { CanvasEvent } from "../../../../registry/GestureHandlerTypes";
import { vertexPart } from "../../../utils/partAddress";
import { calcSnapCandidates } from "../../../utils/snap/calcSnapCandidates";
import { VertexControlHandler } from "../VertexControlHandler";

const handler = new VertexControlHandler();
// A click resolves the vertex through the registry's `vertex` kind, which
// "polyline" carries as a built-in type.
const registries = createTestRegistries();

const makePoly = (id: string, points: Point[]) =>
	({
		id,
		type: "polyline",
		points,
	}) as unknown;

/**
 * Build a state during a vertex drag. Set snapCandidates to null to disable
 * inter-object snapping so that only the Shift axis-lock logic can be verified.
 */
const makeDragState = (points: Point[]): CanvasControllerState => {
	const poly = makePoly("poly-1", points);
	return {
		objects: { "poly-1": poly },
		rootIds: ["poly-1"],
		selectedIds: [],
		objectPartSelection: null,
		viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
		activeDrag: {
			startSnapshot: {
				objects: { "poly-1": poly },
				keyPoints: {},
				snapCandidates: null,
				selectedIds: [],
				selectedIdsWithDescendants: new Set(),
				multiSelectGroup: null,
				viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
			},
			kind: "other",
		},
	} as unknown as CanvasControllerState;
};

const makeDragEvent = (
	last: Point,
	shift: boolean,
	vertexIndex = 0,
): CanvasEvent =>
	({
		type: "drag",
		targetKind: "control",
		targetId: "poly-1",
		targetPart: vertexPart(vertexIndex),
		button: 0,
		last,
		mods: { shift, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

const vertexAt = (state: CanvasControllerState, index: number) =>
	(state.objects["poly-1"] as unknown as { points: Point[] }).points[index];

/**
 * Recursively freeze a state so any mutation inside the handler throws
 * (strict mode). Guards the "handlers never mutate their input" contract.
 */
const deepFreeze = <T>(target: T): T => {
	if (target && typeof target === "object" && !Object.isFrozen(target)) {
		Object.freeze(target);
		for (const value of Object.values(target)) {
			deepFreeze(value);
		}
	}
	return target;
};

describe("VertexControlHandler - Shift axis lock", () => {
	it("without Shift, the vertex follows the cursor position and no feedback is shown", () => {
		const next = handler.handle(
			makeDragState([
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
			]),
			makeDragEvent({ x: 30, y: 12 }, false),
			registries,
		);
		expect(vertexAt(next, 0)).toEqual({ x: 30, y: 12 });
		expect(next.axisLockFeedback).toBeNull();
	});

	it("with Shift and horizontal dominance, locks Y to the start position and moves only X", () => {
		const next = handler.handle(
			makeDragState([
				{ x: 20, y: 30 },
				{ x: 100, y: 0 },
			]),
			makeDragEvent({ x: 70, y: 38 }, true),
			registries,
		);
		expect(vertexAt(next, 0)).toEqual({ x: 70, y: 30 });
		expect(next.axisLockFeedback).toEqual({ y: 30 });
	});

	it("with Shift and vertical dominance, locks X to the start position and moves only Y", () => {
		const next = handler.handle(
			makeDragState([
				{ x: 20, y: 30 },
				{ x: 100, y: 0 },
			]),
			makeDragEvent({ x: 25, y: 80 }, true),
			registries,
		);
		expect(vertexAt(next, 0)).toEqual({ x: 20, y: 80 });
		expect(next.axisLockFeedback).toEqual({ x: 20 });
	});

	describe("origin snap (near the start vertex)", () => {
		it("snaps to the start vertex and shows both-axis guides when the free-axis movement is within the threshold", () => {
			const next = handler.handle(
				makeDragState([
					{ x: 20, y: 30 },
					{ x: 100, y: 0 },
				]),
				// dx=4 (dominant/free axis), dy=3 -> 4 <= 6px (zoom=1), snaps to origin
				makeDragEvent({ x: 24, y: 33 }, true),
				registries,
			);
			expect(vertexAt(next, 0)).toEqual({ x: 20, y: 30 });
			expect(next.axisLockFeedback).toEqual({ x: 20, y: 30 });
		});

		it("beyond the threshold, snapping releases and it returns to single-axis lock", () => {
			const next = handler.handle(
				makeDragState([
					{ x: 20, y: 30 },
					{ x: 100, y: 0 },
				]),
				// dx=8 > 6px -> horizontal movement with Y locked
				makeDragEvent({ x: 28, y: 33 }, true),
				registries,
			);
			expect(vertexAt(next, 0)).toEqual({ x: 28, y: 30 });
			expect(next.axisLockFeedback).toEqual({ y: 30 });
		});
	});
});

describe("VertexControlHandler - handleDragEnd", () => {
	it("computes the final state from a deep-frozen input without mutating it", () => {
		const state = deepFreeze(
			makeDragState([
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
			]),
		);
		const event = {
			...makeDragEvent({ x: 30, y: 12 }, false),
			type: "dragEnd",
		} as CanvasEvent;

		const next = handler.handle(state, event, registries);

		expect(vertexAt(next, 0)).toEqual({ x: 30, y: 12 });
		expect(next.edgeScrollEnabled).toBe(false);
		// The frozen input state must be left untouched
		expect(vertexAt(state, 0)).toEqual({ x: 0, y: 0 });
	});
});

describe("VertexControlHandler - snapping against the edited poly", () => {
	// bbox (0,0)-(100,60), center (50,30)
	const polyPoints: Point[] = [
		{ x: 0, y: 0 },
		{ x: 30, y: 20 },
		{ x: 100, y: 60 },
	];
	// A rect spanning (200,100)-(300,200), center (250,150)
	const rectKeyPoints = calcPolyKeyPoints([
		{ x: 200, y: 100 },
		{ x: 300, y: 200 },
	]) as FrameKeyPoints;

	/** Runs dragStart then drag on vertex 0 with candidates built the way handleGesture builds them. */
	const dragVertex0To = (last: Point): CanvasControllerState => {
		const base = makeDragState(polyPoints);
		const baseDrag = base.activeDrag as NonNullable<
			CanvasControllerState["activeDrag"]
		>;
		const objects = {
			...base.objects,
			"rect-1": { id: "rect-1", type: "rect" } as unknown as ObjectState,
		};
		const snapCandidates = calcSnapCandidates(objects, {
			"poly-1": calcPolyKeyPoints(polyPoints) as FrameKeyPoints,
			"rect-1": rectKeyPoints,
		});
		const state = {
			...base,
			objects,
			activeDrag: {
				...baseDrag,
				startSnapshot: {
					...baseDrag.startSnapshot,
					objects,
					snapCandidates,
				},
			},
		} as CanvasControllerState;

		const afterStart = handler.handle(
			state,
			{
				...makeDragEvent(polyPoints[0], false),
				type: "dragStart",
			} as CanvasEvent,
			registries,
		);
		return handler.handle(afterStart, makeDragEvent(last, false), registries);
	};

	it("does not snap to its own bbox center", () => {
		const next = dragVertex0To({ x: 52, y: 33 });

		expect(vertexAt(next, 0)).toEqual({ x: 52, y: 33 });
	});

	it("snaps to another vertex of the same poly", () => {
		const next = dragVertex0To({ x: 33, y: 23 });

		expect(vertexAt(next, 0)).toEqual({ x: 30, y: 20 });
		expect(next.snapFeedback?.x).toEqual([
			expect.objectContaining({ coordinate: 30, sourceObjectIds: ["poly-1"] }),
		]);
	});

	it("still snaps to another object's center", () => {
		const next = dragVertex0To({ x: 247, y: 153 });

		expect(vertexAt(next, 0)).toEqual({ x: 250, y: 150 });
	});
});

describe("VertexControlHandler - picking a vertex", () => {
	const clickEvent = (vertexIndex: number): CanvasEvent =>
		({
			type: "click",
			targetKind: "control",
			targetId: "poly-1",
			targetPart: vertexPart(vertexIndex),
			button: 0,
			last: { x: 0, y: 0 },
			mods: { shift: false, alt: false, ctrl: false, meta: false },
		}) as unknown as CanvasEvent;

	it("a click picks the vertex it landed on, as one collapsed range", () => {
		const next = handler.handle(
			makeDragState([
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
			]),
			clickEvent(1),
			registries,
		);
		expect(next.objectPartSelection).toEqual({
			objectId: "poly-1",
			kind: VERTEX_PART_KIND,
			ranges: [{ anchorId: "1", focusId: "1" }],
		});
	});

	it("a click on an index the object has outgrown picks nothing", () => {
		const state = makeDragState([
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
		]);

		// Nothing was picked, so the state is handed back as it stands rather than
		// rewritten with the same null (applyPartClick).
		expect(handler.handle(state, clickEvent(7), registries)).toBe(state);

		const picked = handler.handle(state, clickEvent(1), registries);
		expect(
			handler.handle(picked, clickEvent(7), registries).objectPartSelection,
		).toBeNull();
	});

	it("a dragStart drops the pick, the vertex being moved rather than addressed", () => {
		const picked = handler.handle(
			makeDragState([
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
			]),
			clickEvent(0),
			registries,
		);
		const next = handler.handle(
			picked,
			{
				...makeDragEvent({ x: 0, y: 0 }, false),
				type: "dragStart",
			} as CanvasEvent,
			registries,
		);
		expect(next.objectPartSelection).toBeNull();
	});
});
