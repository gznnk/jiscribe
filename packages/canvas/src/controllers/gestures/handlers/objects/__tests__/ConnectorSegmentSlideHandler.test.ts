import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import type { Point } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import type { ConnectorState } from "../../../../../states/objects/connector/ConnectorState";
import { deepFreezeState } from "../../../../__tests__/support/deepFreezeState";
import type {
	CanvasControllerState,
	SnapCandidate,
	SnapCandidates,
} from "../../../../CanvasTypes";
import { createInitialControllerState } from "../../../../reducer/createInitialControllerState";
import { createTestRegistries } from "../../../../registries/createCanvasRegistries";
import type {
	CanvasEvent,
	EventType,
} from "../../../registry/GestureHandlerTypes";
import { ConnectorSegmentSlideHandler } from "../ConnectorSegmentSlideHandler";

const registries = createTestRegistries();

const emptyDoc: CanvasDoc = { version: 1, root: [] } as unknown as CanvasDoc;

/**
 * A right-angle connector between two free endpoints, so the resolved path is exactly
 * `[source, ...points, target]` with no owner geometry involved. The default is
 * (0,0) → (100,0) → (100,80) → (200,80): segments 0 and 2 are horizontal (a drag moves their y),
 * segment 1 is vertical (a drag moves its x), and 2 is the last index the path has.
 */
const orthogonalConnector = (
	points: Point[] = [
		{ x: 100, y: 0 },
		{ x: 100, y: 80 },
	],
	source: Point = { x: 0, y: 0 },
	target: Point = { x: 200, y: 80 },
): ConnectorState =>
	({
		id: "c1",
		type: "connector",
		points,
		source: { anchor: { kind: "free", point: source } },
		target: { anchor: { kind: "free", point: target } },
		routing: "orthogonal",
		stroke: "auto",
		strokeWidth: 2,
	}) as unknown as ConnectorState;

/** Same connector with its source pinned to a shape that is not in the objects map. */
const connectorOnMissingOwner = (): ConnectorState =>
	({
		...orthogonalConnector(),
		source: { owner: { id: "gone" }, anchor: { kind: "center" } },
	}) as ConnectorState;

/** One candidate on an object other than the dragged connector, at `coordinate`. */
const candidateAt = (
	coordinate: number,
	edge: SnapCandidate["edge"],
): SnapCandidate => ({
	objectId: "b",
	coordinate,
	edge,
	perpendicularMin: -50,
	perpendicularMax: 50,
});

/** Candidates on x only, on y only, or on neither — whichever a case needs. */
const candidates = (xs: number[], ys: number[] = []): SnapCandidates => ({
	x: xs.map((coordinate) => candidateAt(coordinate, "hCenter")),
	y: ys.map((coordinate) => candidateAt(coordinate, "vCenter")),
});

/** State holding the connector, plus the drag handleGesture would have opened. */
const stateWith = (
	connector: ConnectorState,
	snapCandidates: SnapCandidates = candidates([]),
): CanvasControllerState => {
	const base = createInitialControllerState(emptyDoc, registries);
	const objects = { ...base.objects, [connector.id]: connector };
	return deepFreezeState({
		...base,
		objects,
		rootIds: [...base.rootIds, connector.id],
		activeDrag: {
			startSnapshot: {
				objects,
				keyPoints: {},
				bboxes: {},
				snapCandidates,
				selectedIds: [],
				selectedIdsWithDescendants: new Set(),
				multiSelectGroup: null,
				viewport: base.viewport,
			},
			kind: "other",
		},
	});
};

const dragEvent = (
	type: EventType,
	start: Point,
	last: Point,
	targetPart = "segment-slide:1",
	targetId = "c1",
): CanvasEvent =>
	({
		type,
		target: null,
		targetId,
		targetKind: "connector",
		targetPart,
		start,
		last,
		delta: { x: last.x - start.x, y: last.y - start.y },
		clientStart: start,
		clientLast: last,
		clientDelta: { x: last.x - start.x, y: last.y - start.y },
		mods: { shift: false, ctrl: false, alt: false, meta: false },
		getHovered: () => [],
		time: 0,
		button: 0,
	}) as unknown as CanvasEvent;

/** Same event with Ctrl held (the snap bypass shared with the object-move snap). */
const withCtrl = (event: CanvasEvent): CanvasEvent =>
	({ ...event, mods: { ...event.mods, ctrl: true } }) as CanvasEvent;

const connectorOf = (state: CanvasControllerState, id = "c1") =>
	state.objects[id] as ConnectorState;

const pointsOf = (state: CanvasControllerState) => connectorOf(state).points;

describe("ConnectorSegmentSlideHandler - supports", () => {
	const supported: EventType[] = ["dragStart", "drag", "dragEnd"];
	const unsupported: EventType[] = [
		"pressed",
		"click",
		"doubleClick",
		"scroll",
		"zoom",
	];

	it("takes only left-button drags on a segment-slide band", () => {
		for (const type of supported) {
			expect(
				ConnectorSegmentSlideHandler.supports(
					dragEvent(type, { x: 0, y: 0 }, { x: 1, y: 1 }),
				),
			).toBe(true);
		}
		for (const type of unsupported) {
			expect(
				ConnectorSegmentSlideHandler.supports(
					dragEvent(type, { x: 0, y: 0 }, { x: 1, y: 1 }),
				),
			).toBe(false);
		}
	});

	it("leaves the sibling connector parts, other kinds, and non-left buttons alone", () => {
		const onMoveBand = dragEvent(
			"dragStart",
			{ x: 0, y: 0 },
			{ x: 1, y: 1 },
			"segment-move:1",
		);
		expect(ConnectorSegmentSlideHandler.supports(onMoveBand)).toBe(false);

		const onLabel = dragEvent(
			"dragStart",
			{ x: 0, y: 0 },
			{ x: 1, y: 1 },
			"label",
		);
		expect(ConnectorSegmentSlideHandler.supports(onLabel)).toBe(false);

		const onBareLine = {
			...dragEvent("dragStart", { x: 0, y: 0 }, { x: 1, y: 1 }),
			targetPart: undefined,
		} as CanvasEvent;
		expect(ConnectorSegmentSlideHandler.supports(onBareLine)).toBe(false);

		const onObject = {
			...dragEvent("dragStart", { x: 0, y: 0 }, { x: 1, y: 1 }),
			targetKind: "object",
		} as CanvasEvent;
		expect(ConnectorSegmentSlideHandler.supports(onObject)).toBe(false);

		const rightButton = {
			...dragEvent("dragStart", { x: 0, y: 0 }, { x: 1, y: 1 }),
			button: 2,
		} as CanvasEvent;
		expect(ConnectorSegmentSlideHandler.supports(rightButton)).toBe(false);
	});
});

describe("ConnectorSegmentSlideHandler - dragStart", () => {
	it("selects the connector exclusively and enables edge scrolling", () => {
		const state = {
			...stateWith(orthogonalConnector()),
			selectedIds: ["other"],
			selectedVertex: { objectId: "other", vertexIndex: 0 },
			objectMenuOpenId: "style",
			stencilLibraryOpenCategory: "flowchart",
			contextMenuPosition: { x: 1, y: 1 },
		} as unknown as CanvasControllerState;

		const next = ConnectorSegmentSlideHandler.handle(
			state,
			dragEvent("dragStart", { x: 100, y: 40 }, { x: 100, y: 40 }),
			registries,
		);

		expect(next.selectedConnectorId).toBe("c1");
		expect(next.selectedIds).toEqual([]);
		expect(next.selectedVertex).toBeNull();
		expect(next.multiSelectGroup).toBeNull();
		expect(next.objectMenuOpenId).toBeNull();
		expect(next.stencilLibraryOpenCategory).toBeNull();
		expect(next.contextMenuPosition).toBeNull();
		expect(next.edgeScrollEnabled).toBe(true);
	});
});

describe("ConnectorSegmentSlideHandler - drag", () => {
	it("moves a vertical segment to the cursor's x and ignores how far it travelled on y", () => {
		const next = ConnectorSegmentSlideHandler.handle(
			stateWith(orthogonalConnector()),
			dragEvent("drag", { x: 100, y: 40 }, { x: 140, y: 500 }),
			registries,
		);
		expect(pointsOf(next)).toEqual([
			{ x: 140, y: 0 },
			{ x: 140, y: 80 },
		]);
	});

	it("takes the last segment of the path, joining the endpoint by a new perpendicular leg", () => {
		// segmentIndex 2 is path.length - 2, the highest index resolveSegment accepts.
		const next = ConnectorSegmentSlideHandler.handle(
			stateWith(orthogonalConnector()),
			dragEvent(
				"drag",
				{ x: 150, y: 80 },
				{ x: 500, y: 120 },
				"segment-slide:2",
			),
			registries,
		);
		expect(pointsOf(next)).toEqual([
			{ x: 100, y: 0 },
			{ x: 100, y: 120 },
			{ x: 200, y: 120 },
		]);
		// The endpoint keeps its own coordinate; what moved is the new corner in front of it.
		expect(connectorOf(next).target).toEqual({
			anchor: { kind: "free", point: { x: 200, y: 80 } },
		});
	});

	it("derives each frame from the snapshot, so a later frame is not the earlier one plus its delta", () => {
		const state = stateWith(orthogonalConnector());
		const frame1 = ConnectorSegmentSlideHandler.handle(
			state,
			dragEvent("drag", { x: 100, y: 40 }, { x: 180, y: 40 }),
			registries,
		);
		const frame2 = ConnectorSegmentSlideHandler.handle(
			frame1,
			dragEvent("drag", { x: 100, y: 40 }, { x: 140, y: 40 }),
			registries,
		);
		expect(pointsOf(frame2)).toEqual([
			{ x: 140, y: 0 },
			{ x: 140, y: 80 },
		]);
	});
});

describe("ConnectorSegmentSlideHandler - segments it refuses", () => {
	const refuses = (
		state: CanvasControllerState,
		targetPart: string,
		last: Point = { x: 140, y: 500 },
		targetId = "c1",
	) =>
		expect(
			ConnectorSegmentSlideHandler.handle(
				state,
				dragEvent("drag", { x: 100, y: 40 }, last, targetPart, targetId),
				registries,
			),
		).toBe(state);

	it("leaves the state alone for an index past the last segment", () => {
		// The path has 4 points, so 2 is the last segment and 3 has nothing to span.
		refuses(stateWith(orthogonalConnector()), "segment-slide:3");
	});

	it("leaves the state alone for a segment that is not axis-aligned", () => {
		// alignVertexPath only straightens the two vertices next to the endpoints, so a stored
		// diagonal in the middle survives into the drawn path: here segment 2, (100,40) → (160,80).
		const diagonal = stateWith(
			orthogonalConnector(
				[
					{ x: 100, y: 0 },
					{ x: 100, y: 40 },
					{ x: 160, y: 80 },
					{ x: 160, y: 120 },
				],
				{ x: 0, y: 0 },
				{ x: 200, y: 120 },
			),
		);
		refuses(diagonal, "segment-slide:2");
	});

	it("leaves the state alone for a segment of zero length", () => {
		// Two vertices on the same spot: the segment between them has no direction to keep.
		const degenerate = stateWith(
			orthogonalConnector([
				{ x: 100, y: 0 },
				{ x: 100, y: 0 },
				{ x: 100, y: 80 },
			]),
		);
		refuses(degenerate, "segment-slide:1");
	});

	it("leaves the state alone when the drawn path cannot be resolved", () => {
		refuses(stateWith(connectorOnMissingOwner()), "segment-slide:1");
	});

	it("leaves the state alone for a part carrying no usable index", () => {
		const state = stateWith(orthogonalConnector());
		for (const part of [
			"segment-slide:",
			"segment-slide:abc",
			"segment-slide:-1",
		]) {
			refuses(state, part);
		}
	});

	it("leaves the state alone without a target id", () => {
		const state = stateWith(orthogonalConnector());
		const untargeted = {
			...dragEvent("drag", { x: 100, y: 40 }, { x: 140, y: 500 }),
			targetId: undefined,
		} as CanvasEvent;
		expect(
			ConnectorSegmentSlideHandler.handle(state, untargeted, registries),
		).toBe(state);
	});

	it("leaves the state alone when the snapshot or the connector is missing", () => {
		refuses(
			stateWith(orthogonalConnector()),
			"segment-slide:1",
			{ x: 140, y: 500 },
			"missing",
		);

		const withoutSnapshot = {
			...stateWith(orthogonalConnector()),
			activeDrag: null,
		} as CanvasControllerState;
		refuses(withoutSnapshot, "segment-slide:1");
	});
});

describe("ConnectorSegmentSlideHandler - axis-limited snap", () => {
	it("corrects along the segment's own axis and stays deaf to the other one", () => {
		// The vertical segment moves on x: the candidate at 143 pulls it, the one at 502 —
		// within reach of the cursor's y — has no axis to act on.
		const next = ConnectorSegmentSlideHandler.handle(
			stateWith(orthogonalConnector(), candidates([143], [502])),
			dragEvent("drag", { x: 100, y: 40 }, { x: 140, y: 500 }),
			registries,
		);
		expect(pointsOf(next)).toEqual([
			{ x: 143, y: 0 },
			{ x: 143, y: 80 },
		]);
		expect(next.snapFeedback?.y).toEqual([]);
		expect(next.snapFeedback?.x).toHaveLength(1);
		expect(next.snapFeedback?.x[0].coordinate).toBe(143);
		expect(next.snapFeedback?.x[0].sourceObjectIds).toEqual(["b"]);
	});

	it("clears the feedback when nothing is within reach", () => {
		const next = ConnectorSegmentSlideHandler.handle(
			stateWith(orthogonalConnector(), candidates([500])),
			dragEvent("drag", { x: 100, y: 40 }, { x: 140, y: 500 }),
			registries,
		);
		expect(pointsOf(next)).toEqual([
			{ x: 140, y: 0 },
			{ x: 140, y: 80 },
		]);
		expect(next.snapFeedback).toEqual({ x: [], y: [] });
	});

	it("bypasses the snap while Ctrl is held", () => {
		const next = ConnectorSegmentSlideHandler.handle(
			stateWith(orthogonalConnector(), candidates([143])),
			withCtrl(dragEvent("drag", { x: 100, y: 40 }, { x: 140, y: 500 })),
			registries,
		);
		expect(pointsOf(next)).toEqual([
			{ x: 140, y: 0 },
			{ x: 140, y: 80 },
		]);
		expect(next.snapFeedback).toEqual({ x: [], y: [] });
	});
});

describe("ConnectorSegmentSlideHandler - dragEnd", () => {
	it("applies the final frame and disables edge scrolling", () => {
		const afterStart = ConnectorSegmentSlideHandler.handle(
			stateWith(orthogonalConnector()),
			dragEvent("dragStart", { x: 100, y: 40 }, { x: 100, y: 40 }),
			registries,
		);
		expect(afterStart.edgeScrollEnabled).toBe(true);

		const afterEnd = ConnectorSegmentSlideHandler.handle(
			afterStart,
			dragEvent("dragEnd", { x: 100, y: 40 }, { x: 140, y: 40 }),
			registries,
		);

		expect(pointsOf(afterEnd)).toEqual([
			{ x: 140, y: 0 },
			{ x: 140, y: 80 },
		]);
		expect(afterEnd.objects).not.toBe(afterStart.objects);
		expect(afterEnd.edgeScrollEnabled).toBe(false);
	});

	it("disables edge scrolling even on a segment it refuses to move", () => {
		const afterStart = ConnectorSegmentSlideHandler.handle(
			stateWith(orthogonalConnector()),
			dragEvent(
				"dragStart",
				{ x: 100, y: 40 },
				{ x: 100, y: 40 },
				"segment-slide:3",
			),
			registries,
		);
		expect(afterStart.edgeScrollEnabled).toBe(true);

		const afterEnd = ConnectorSegmentSlideHandler.handle(
			afterStart,
			dragEvent(
				"dragEnd",
				{ x: 100, y: 40 },
				{ x: 140, y: 40 },
				"segment-slide:3",
			),
			registries,
		);
		expect(pointsOf(afterEnd)).toEqual([
			{ x: 100, y: 0 },
			{ x: 100, y: 80 },
		]);
		expect(afterEnd.edgeScrollEnabled).toBe(false);
	});
});
