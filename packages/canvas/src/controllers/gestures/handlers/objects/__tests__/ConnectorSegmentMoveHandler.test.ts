import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import type { Point } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
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
import { SNAP_THRESHOLD_PX } from "../../utils/snap/findSnap";
import { ConnectorSegmentMoveHandler } from "../ConnectorSegmentMoveHandler";

const registries = createTestRegistries();

const emptyDoc: CanvasDoc = { version: 1, root: [] } as unknown as CanvasDoc;

/** The shape the source endpoint is pinned to, so "at least one endpoint is owned" holds. */
const ownerRect: ObjectState = {
	id: "a",
	type: "rect",
	cx: -50,
	cy: 0,
	width: 100,
	height: 100,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
} as unknown as ObjectState;

/**
 * A straight connector pinned to `ownerRect` at its source and free at its target, drawing the
 * path `[source, (100,0), (200,0), (300,0)]`. Segment 1 joins two vertices and segment 2 reaches
 * the free target, so both are freely movable; segment 0 hangs off the pinned end and is not.
 *
 * The owner's geometry never enters the math: the handler moves the endpoint refs and the vertices,
 * and never resolves where the pinned end is drawn.
 */
const connectorWithVertices = (
	points: Point[] = [
		{ x: 100, y: 0 },
		{ x: 200, y: 0 },
	],
): ConnectorState =>
	({
		id: "c1",
		type: "connector",
		points,
		source: { owner: { id: "a" }, anchor: { kind: "center" } },
		target: { anchor: { kind: "free", point: { x: 300, y: 0 } } },
		routing: "straight",
		stroke: "auto",
		strokeWidth: 2,
	}) as unknown as ConnectorState;

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
	const objects = { ...base.objects, a: ownerRect, [connector.id]: connector };
	return deepFreezeState({
		...base,
		objects,
		rootIds: [...base.rootIds, "a", connector.id],
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
	targetPart = "segment-move:1",
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

/**
 * Same state viewed at `zoom`, which is what turns the screen-px threshold into world units.
 * The zoom is set on the snapshot as well as the live viewport, so the case does not depend on
 * which of the two the threshold is read from.
 */
const withZoom = (
	state: CanvasControllerState,
	zoom: number,
): CanvasControllerState => {
	const viewport = { ...state.viewport, zoom };
	return {
		...state,
		viewport,
		activeDrag: state.activeDrag && {
			...state.activeDrag,
			startSnapshot: { ...state.activeDrag.startSnapshot, viewport },
		},
	};
};

const connectorOf = (state: CanvasControllerState, id = "c1") =>
	state.objects[id] as ConnectorState;

const pointsOf = (state: CanvasControllerState) => connectorOf(state).points;

/** The free target endpoint, shaped so a moved one is readable at a glance. */
const targetOf = (state: CanvasControllerState) => connectorOf(state).target;

describe("ConnectorSegmentMoveHandler - supports", () => {
	const supported: EventType[] = ["dragStart", "drag", "dragEnd"];
	const unsupported: EventType[] = [
		"pressed",
		"click",
		"doubleClick",
		"scroll",
		"zoom",
	];

	it("takes only left-button drags on a segment-move band", () => {
		for (const type of supported) {
			expect(
				ConnectorSegmentMoveHandler.supports(
					dragEvent(type, { x: 0, y: 0 }, { x: 1, y: 1 }),
				),
			).toBe(true);
		}
		for (const type of unsupported) {
			expect(
				ConnectorSegmentMoveHandler.supports(
					dragEvent(type, { x: 0, y: 0 }, { x: 1, y: 1 }),
				),
			).toBe(false);
		}
	});

	it("leaves the sibling connector parts, other kinds, and non-left buttons alone", () => {
		const onSlideBand = dragEvent(
			"dragStart",
			{ x: 0, y: 0 },
			{ x: 1, y: 1 },
			"segment-slide:1",
		);
		expect(ConnectorSegmentMoveHandler.supports(onSlideBand)).toBe(false);

		const onLabel = dragEvent(
			"dragStart",
			{ x: 0, y: 0 },
			{ x: 1, y: 1 },
			"label",
		);
		expect(ConnectorSegmentMoveHandler.supports(onLabel)).toBe(false);

		const onBareLine = {
			...dragEvent("dragStart", { x: 0, y: 0 }, { x: 1, y: 1 }),
			targetPart: undefined,
		} as CanvasEvent;
		expect(ConnectorSegmentMoveHandler.supports(onBareLine)).toBe(false);

		const onObject = {
			...dragEvent("dragStart", { x: 0, y: 0 }, { x: 1, y: 1 }),
			targetKind: "object",
		} as CanvasEvent;
		expect(ConnectorSegmentMoveHandler.supports(onObject)).toBe(false);

		const rightButton = {
			...dragEvent("dragStart", { x: 0, y: 0 }, { x: 1, y: 1 }),
			button: 2,
		} as CanvasEvent;
		expect(ConnectorSegmentMoveHandler.supports(rightButton)).toBe(false);
	});
});

describe("ConnectorSegmentMoveHandler - dragStart", () => {
	it("selects the connector exclusively and enables edge scrolling", () => {
		const state = {
			...stateWith(connectorWithVertices()),
			selectedIds: ["other"],
			selectedVertex: { objectId: "other", vertexIndex: 0 },
			objectMenuOpenId: "style",
			stencilLibraryOpenCategory: "flowchart",
			contextMenuPosition: { x: 1, y: 1 },
		} as unknown as CanvasControllerState;

		const next = ConnectorSegmentMoveHandler.handle(
			state,
			dragEvent("dragStart", { x: 150, y: 0 }, { x: 150, y: 0 }),
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

describe("ConnectorSegmentMoveHandler - drag", () => {
	it("moves both ends of the segment by the cursor delta and leaves the rest of the path", () => {
		const next = ConnectorSegmentMoveHandler.handle(
			stateWith(connectorWithVertices()),
			dragEvent("drag", { x: 150, y: 0 }, { x: 160, y: -20 }),
			registries,
		);
		expect(pointsOf(next)).toEqual([
			{ x: 110, y: -20 },
			{ x: 210, y: -20 },
		]);
		expect(targetOf(next)).toEqual({
			anchor: { kind: "free", point: { x: 300, y: 0 } },
		});
	});

	it("carries the free endpoint along when the segment reaches it", () => {
		const next = ConnectorSegmentMoveHandler.handle(
			stateWith(connectorWithVertices()),
			dragEvent("drag", { x: 250, y: 0 }, { x: 260, y: -20 }, "segment-move:2"),
			registries,
		);
		expect(pointsOf(next)).toEqual([
			{ x: 100, y: 0 },
			{ x: 210, y: -20 },
		]);
		expect(targetOf(next)).toEqual({
			anchor: { kind: "free", point: { x: 310, y: -20 } },
		});
	});

	it("derives each frame from the snapshot, so a later frame is not the earlier one plus its delta", () => {
		const state = stateWith(connectorWithVertices());
		const frame1 = ConnectorSegmentMoveHandler.handle(
			state,
			dragEvent("drag", { x: 150, y: 0 }, { x: 200, y: 0 }),
			registries,
		);
		const frame2 = ConnectorSegmentMoveHandler.handle(
			frame1,
			dragEvent("drag", { x: 150, y: 0 }, { x: 160, y: 0 }),
			registries,
		);
		// Cumulative application would land on 160/260; snapshot-based lands on 110/210.
		expect(pointsOf(frame2)).toEqual([
			{ x: 110, y: 0 },
			{ x: 210, y: 0 },
		]);
	});

	it("repeats a frame without moving, so the snap correction never accumulates", () => {
		const state = stateWith(connectorWithVertices(), candidates([213], [-3]));
		const event = dragEvent("drag", { x: 150, y: 0 }, { x: 160, y: 0 });
		const frame1 = ConnectorSegmentMoveHandler.handle(state, event, registries);
		const frame2 = ConnectorSegmentMoveHandler.handle(
			frame1,
			event,
			registries,
		);

		// The 10px drag is pulled a further +3 on x and -3 on y by the two candidates.
		expect(pointsOf(frame1)).toEqual([
			{ x: 113, y: -3 },
			{ x: 213, y: -3 },
		]);
		expect(pointsOf(frame2)).toEqual(pointsOf(frame1));
	});

	it("corrects against the leading end of the segment", () => {
		const next = ConnectorSegmentMoveHandler.handle(
			stateWith(connectorWithVertices(), candidates([213])),
			dragEvent("drag", { x: 150, y: 0 }, { x: 160, y: 0 }),
			registries,
		);
		expect(pointsOf(next)).toEqual([
			{ x: 113, y: 0 },
			{ x: 213, y: 0 },
		]);
	});

	it("corrects against the trailing end of the segment", () => {
		const next = ConnectorSegmentMoveHandler.handle(
			stateWith(connectorWithVertices(), candidates([107])),
			dragEvent("drag", { x: 150, y: 0 }, { x: 160, y: 0 }),
			registries,
		);
		expect(pointsOf(next)).toEqual([
			{ x: 107, y: 0 },
			{ x: 207, y: 0 },
		]);
	});

	it("reports the guide line for the axis that snapped, and none for the other", () => {
		const next = ConnectorSegmentMoveHandler.handle(
			stateWith(connectorWithVertices(), candidates([213])),
			dragEvent("drag", { x: 150, y: 0 }, { x: 160, y: 0 }),
			registries,
		);
		expect(next.snapFeedback).toEqual({
			x: [
				{
					coordinate: 213,
					lineStart: -50,
					lineEnd: 50,
					sourceObjectIds: ["b"],
				},
			],
			y: [],
		});
	});

	it("clears the feedback when nothing is within reach", () => {
		const next = ConnectorSegmentMoveHandler.handle(
			stateWith(connectorWithVertices(), candidates([500])),
			dragEvent("drag", { x: 150, y: 0 }, { x: 160, y: 0 }),
			registries,
		);
		expect(pointsOf(next)).toEqual([
			{ x: 110, y: 0 },
			{ x: 210, y: 0 },
		]);
		expect(next.snapFeedback).toEqual({ x: [], y: [] });
	});

	it("bypasses the snap while Ctrl is held", () => {
		const next = ConnectorSegmentMoveHandler.handle(
			stateWith(connectorWithVertices(), candidates([213])),
			withCtrl(dragEvent("drag", { x: 150, y: 0 }, { x: 160, y: 0 })),
			registries,
		);
		expect(pointsOf(next)).toEqual([
			{ x: 110, y: 0 },
			{ x: 210, y: 0 },
		]);
		expect(next.snapFeedback).toEqual({ x: [], y: [] });
	});

	it("measures the threshold in screen pixels, so zoom 4 narrows it in world units", () => {
		// 3 world units from the moved end: inside the threshold at zoom 1, outside at zoom 4.
		const state = stateWith(connectorWithVertices(), candidates([213]));
		const event = dragEvent("drag", { x: 150, y: 0 }, { x: 160, y: 0 });
		expect(
			pointsOf(ConnectorSegmentMoveHandler.handle(state, event, registries)),
		).toEqual([
			{ x: 113, y: 0 },
			{ x: 213, y: 0 },
		]);
		expect(
			pointsOf(
				ConnectorSegmentMoveHandler.handle(
					withZoom(state, 4),
					event,
					registries,
				),
			),
		).toEqual([
			{ x: 110, y: 0 },
			{ x: 210, y: 0 },
		]);
		expect(SNAP_THRESHOLD_PX / 4).toBeLessThan(3);
	});
});

describe("ConnectorSegmentMoveHandler - segments it refuses", () => {
	it("leaves the state alone for a segment hanging off a pinned endpoint", () => {
		const state = stateWith(connectorWithVertices());
		expect(
			ConnectorSegmentMoveHandler.handle(
				state,
				dragEvent("drag", { x: 50, y: 0 }, { x: 60, y: 0 }, "segment-move:0"),
				registries,
			),
		).toBe(state);
	});

	it("leaves the state alone for an index past the last segment", () => {
		const state = stateWith(connectorWithVertices());
		expect(
			ConnectorSegmentMoveHandler.handle(
				state,
				dragEvent("drag", { x: 150, y: 0 }, { x: 160, y: 0 }, "segment-move:3"),
				registries,
			),
		).toBe(state);
	});

	it("leaves the state alone for a part carrying no usable index", () => {
		const state = stateWith(connectorWithVertices());
		for (const part of [
			"segment-move:",
			"segment-move:abc",
			"segment-move:-1",
		]) {
			expect(
				ConnectorSegmentMoveHandler.handle(
					state,
					dragEvent("drag", { x: 150, y: 0 }, { x: 160, y: 0 }, part),
					registries,
				),
			).toBe(state);
		}
	});

	it("leaves the state alone without a target id", () => {
		const state = stateWith(connectorWithVertices());
		const untargeted = {
			...dragEvent("drag", { x: 150, y: 0 }, { x: 160, y: 0 }),
			targetId: undefined,
		} as CanvasEvent;
		expect(
			ConnectorSegmentMoveHandler.handle(state, untargeted, registries),
		).toBe(state);
	});

	it("leaves the state alone when the snapshot or the connector is missing", () => {
		const state = stateWith(connectorWithVertices());
		expect(
			ConnectorSegmentMoveHandler.handle(
				state,
				dragEvent(
					"drag",
					{ x: 150, y: 0 },
					{ x: 160, y: 0 },
					"segment-move:1",
					"missing",
				),
				registries,
			),
		).toBe(state);

		const withoutSnapshot = {
			...state,
			activeDrag: null,
		} as CanvasControllerState;
		expect(
			ConnectorSegmentMoveHandler.handle(
				withoutSnapshot,
				dragEvent("drag", { x: 150, y: 0 }, { x: 160, y: 0 }),
				registries,
			),
		).toBe(withoutSnapshot);
	});
});

describe("ConnectorSegmentMoveHandler - dragEnd", () => {
	it("applies the final frame and disables edge scrolling", () => {
		const state = stateWith(connectorWithVertices());
		const afterStart = ConnectorSegmentMoveHandler.handle(
			state,
			dragEvent("dragStart", { x: 150, y: 0 }, { x: 150, y: 0 }),
			registries,
		);
		const afterEnd = ConnectorSegmentMoveHandler.handle(
			afterStart,
			dragEvent("dragEnd", { x: 150, y: 0 }, { x: 160, y: -20 }),
			registries,
		);

		expect(pointsOf(afterEnd)).toEqual([
			{ x: 110, y: -20 },
			{ x: 210, y: -20 },
		]);
		expect(afterEnd.objects).not.toBe(afterStart.objects);
		expect(afterEnd.edgeScrollEnabled).toBe(false);
	});

	it("disables edge scrolling even on a segment it refuses to move", () => {
		const afterStart = ConnectorSegmentMoveHandler.handle(
			stateWith(connectorWithVertices()),
			dragEvent(
				"dragStart",
				{ x: 50, y: 0 },
				{ x: 50, y: 0 },
				"segment-move:0",
			),
			registries,
		);
		expect(afterStart.edgeScrollEnabled).toBe(true);

		const afterEnd = ConnectorSegmentMoveHandler.handle(
			afterStart,
			dragEvent("dragEnd", { x: 50, y: 0 }, { x: 60, y: 0 }, "segment-move:0"),
			registries,
		);
		expect(pointsOf(afterEnd)).toEqual([
			{ x: 100, y: 0 },
			{ x: 200, y: 0 },
		]);
		expect(afterEnd.edgeScrollEnabled).toBe(false);
	});
});
