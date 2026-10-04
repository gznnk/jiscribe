import { calcPolyKeyPoints } from "@jiscribe/geometry";
import type { FrameKeyPoints, Point } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { selectionOf } from "../../../../../selection/__tests__/support/selectionOf";
import type { CanvasEvent } from "../../../../registry/GestureHandlerTypes";
import { calcSnapCandidates } from "../../../utils/snap/calcSnapCandidates";
import { VertexInsertHandler } from "../VertexInsertHandler";

const handler = new VertexInsertHandler();

const makePoly = (id: string, points: Point[]) =>
	({
		id,
		type: "polyline",
		points,
	}) as unknown;

/**
 * Build a state before a vertex-insert drag. Set snapCandidates to null to
 * disable inter-object snapping.
 */
const makeState = (points: Point[]): CanvasControllerState => {
	const poly = makePoly("poly-1", points);
	return {
		objects: { "poly-1": poly },
		rootIds: ["poly-1"],
		selection: selectionOf([]),
		viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
		activeDrag: {
			startSnapshot: {
				objects: { "poly-1": poly },
				keyPoints: {},
				snapCandidates: null,
				selection: selectionOf([]),
				selectedIdsWithDescendants: new Set(),
				multiSelectGroup: null,
				viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
			},
			kind: "other",
		},
	} as unknown as CanvasControllerState;
};

const makeEvent = (
	type: "dragStart" | "drag" | "dragEnd",
	last: Point,
	segmentIndex = 0,
): CanvasEvent =>
	({
		type,
		targetKind: "control",
		targetId: "poly-1",
		targetPart: `vertex-insert:${segmentIndex}`,
		button: 0,
		last,
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

const pointsOf = (state: CanvasControllerState) =>
	(state.objects["poly-1"] as unknown as { points: Point[] }).points;

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

describe("VertexInsertHandler - handleDragEnd", () => {
	it("computes the final state from a deep-frozen input without mutating it", () => {
		// dragStart inserts a new vertex on segment 0 at the pointer position
		const afterStart = handler.handle(
			makeState([
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
			]),
			makeEvent("dragStart", { x: 50, y: 0 }),
		);
		expect(pointsOf(afterStart)).toEqual([
			{ x: 0, y: 0 },
			{ x: 50, y: 0 },
			{ x: 100, y: 0 },
		]);

		// dragEnd commits the inserted vertex at the final pointer position
		const frozen = deepFreeze(afterStart);
		const next = handler.handle(frozen, makeEvent("dragEnd", { x: 60, y: 40 }));

		expect(pointsOf(next)).toEqual([
			{ x: 0, y: 0 },
			{ x: 60, y: 40 },
			{ x: 100, y: 0 },
		]);
		expect(next.edgeScrollEnabled).toBe(false);
		// The frozen input state must be left untouched
		expect(pointsOf(frozen)[1]).toEqual({ x: 50, y: 0 });
	});
});

describe("VertexInsertHandler - snapping against the edited poly", () => {
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

	/** Inserts a vertex on segment 1 and drags it, with candidates built the way handleGesture builds them. */
	const dragInsertedVertexTo = (last: Point): Point => {
		const base = makeState(polyPoints);
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
				startSnapshot: { ...baseDrag.startSnapshot, objects, snapCandidates },
			},
		} as CanvasControllerState;

		const afterStart = handler.handle(
			state,
			makeEvent("dragStart", { x: 65, y: 40 }, 1),
		);
		const next = handler.handle(afterStart, makeEvent("drag", last, 1));
		return pointsOf(next)[2];
	};

	it("does not snap to its own bbox center", () => {
		expect(dragInsertedVertexTo({ x: 52, y: 33 })).toEqual({ x: 52, y: 33 });
	});

	it("snaps to another vertex of the same poly", () => {
		expect(dragInsertedVertexTo({ x: 33, y: 23 })).toEqual({ x: 30, y: 20 });
	});

	it("still snaps to another object's center", () => {
		expect(dragInsertedVertexTo({ x: 247, y: 153 })).toEqual({
			x: 250,
			y: 150,
		});
	});
});
