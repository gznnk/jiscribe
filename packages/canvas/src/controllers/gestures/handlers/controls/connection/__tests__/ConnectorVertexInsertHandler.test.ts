import type { Point } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../../../CanvasTypes";
import type { CanvasEvent } from "../../../../registry/GestureHandlerTypes";
import { VertexControlHandler } from "../../vertex/VertexControlHandler";
import { VertexInsertHandler } from "../../vertex/VertexInsertHandler";
import { ConnectionAnchorEventHandler } from "../ConnectionAnchorEventHandler";
import { ConnectorVertexInsertHandler } from "../ConnectorVertexInsertHandler";

const insertHandler = new ConnectorVertexInsertHandler();

/** A minimal event carrying only targetKind / targetId, for verifying supports(). */
const controlEvent = (
	targetId: string | undefined,
	targetKind = "control",
): CanvasEvent =>
	({
		type: "dragStart",
		targetKind,
		targetId,
		button: 0,
	}) as unknown as CanvasEvent;

const makeConnector = (id: string, points: Point[]) =>
	({
		id,
		type: "connector",
		points,
		source: { owner: { type: "rect", id: "a" }, anchor: { kind: "center" } },
		target: { owner: { type: "rect", id: "b" }, anchor: { kind: "center" } },
	}) as unknown;

const makeState = (points: Point[]): CanvasControllerState => {
	const connector = makeConnector("conn-1", points);
	return {
		objects: { "conn-1": connector },
		rootIds: ["conn-1"],
		selectedIds: [],
		selectedConnectorId: "conn-1",
		selectedVertex: null,
		viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
		eventStartSnapshot: {
			objects: { "conn-1": connector },
			keyPoints: {},
			snapCandidates: null,
			selectedIds: [],
			selectedIdsWithDescendants: new Set(),
			multiSelectGroup: null,
			viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
		},
	} as unknown as CanvasControllerState;
};

const insertEvent = (
	type: "dragStart" | "drag" | "dragEnd",
	last: Point,
	segmentIndex: number,
	button = 0,
): CanvasEvent =>
	({
		type,
		targetKind: "control",
		targetId: `connector-vertex-insert:conn-1:${segmentIndex}`,
		button,
		last,
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

const pointsOf = (state: CanvasControllerState, id = "conn-1") =>
	(state.objects[id] as unknown as { points: Point[] }).points;

describe("ConnectorVertexInsertHandler", () => {
	it("can drop the first bend point on the only segment of a straight connector (no waypoints)", () => {
		const state = makeState([]);
		const next = insertHandler.handle(
			state,
			insertEvent("dragStart", { x: 50, y: 50 }, 0),
		);
		expect(pointsOf(next)).toEqual([{ x: 50, y: 50 }]);
		// eventStartSnapshot is also updated for the subsequent drag
		expect(pointsOf(next.eventStartSnapshot as never)).toEqual([
			{ x: 50, y: 50 },
		]);
	});

	it("segment index is based on the endpoint-inclusive path; inserts into waypoints via splice(segmentIndex)", () => {
		// Insert into segment 1 (w0->w1) of the drawing path [source, w0, w1, target]
		const state = makeState([
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
		]);
		const next = insertHandler.handle(
			state,
			insertEvent("dragStart", { x: 50, y: 40 }, 1),
		);
		expect(pointsOf(next)).toEqual([
			{ x: 0, y: 0 },
			{ x: 50, y: 40 },
			{ x: 100, y: 0 },
		]);
	});

	it("appends to the end for the last segment (segmentIndex = waypoints.length)", () => {
		const state = makeState([{ x: 0, y: 0 }]);
		const next = insertHandler.handle(
			state,
			insertEvent("dragStart", { x: 80, y: 80 }, 1),
		);
		expect(pointsOf(next)).toEqual([
			{ x: 0, y: 0 },
			{ x: 80, y: 80 },
		]);
	});

	it("can move a point inserted on dragStart via drag", () => {
		const started = insertHandler.handle(
			makeState([]),
			insertEvent("dragStart", { x: 50, y: 50 }, 0),
		);
		const dragged = insertHandler.handle(
			started,
			insertEvent("drag", { x: 70, y: 90 }, 0),
		);
		expect(pointsOf(dragged)).toEqual([{ x: 70, y: 90 }]);
	});

	it("disables edgeScroll and confirms on dragEnd", () => {
		const started = insertHandler.handle(
			makeState([]),
			insertEvent("dragStart", { x: 50, y: 50 }, 0),
		);
		const ended = insertHandler.handle(
			started,
			insertEvent("dragEnd", { x: 60, y: 60 }, 0),
		);
		expect(pointsOf(ended)).toEqual([{ x: 60, y: 60 }]);
		expect(ended.edgeScrollEnabled).toBe(false);
	});

	it("ignores non-left clicks (button !== 0)", () => {
		const state = makeState([]);
		const next = insertHandler.handle(
			state,
			insertEvent("dragStart", { x: 50, y: 50 }, 0, 2),
		);
		expect(pointsOf(next)).toEqual([]);
	});

	it("has no effect on non-connector objects", () => {
		const state = makeState([]);
		state.objects["conn-1"] = { id: "conn-1", type: "rect" } as never;
		const next = insertHandler.handle(
			state,
			insertEvent("dragStart", { x: 50, y: 50 }, 0),
		);
		expect(next).toBe(state);
	});

	it("ignores a segmentIndex beyond the number of segments (the path has waypoints.length + 1 segments)", () => {
		// 0 waypoints -> 1 segment (index 0 only). index 5 is out of range.
		const state = makeState([]);
		const next = insertHandler.handle(
			state,
			insertEvent("dragStart", { x: 50, y: 50 }, 5),
		);
		expect(pointsOf(next)).toEqual([]);
	});
});

describe("ConnectorVertexInsertHandler.supports / routing conflicts", () => {
	const vertexInsert = new VertexInsertHandler();
	const connectionAnchor = new ConnectionAnchorEventHandler();

	it("supports only connector-vertex-insert: control events", () => {
		expect(
			insertHandler.supports(controlEvent("connector-vertex-insert:c:0")),
		).toBe(true);
		expect(insertHandler.supports(controlEvent("vertex-insert:c:0"))).toBe(
			false,
		);
		expect(
			insertHandler.supports(controlEvent("connection-anchor:edit:c:source")),
		).toBe(false);
		expect(insertHandler.supports(controlEvent(undefined))).toBe(false);
		expect(
			insertHandler.supports(
				controlEvent("connector-vertex-insert:c:0", "object"),
			),
		).toBe(false);
	});

	it("sibling handlers with confusing prefixes do not steal connector-vertex-insert", () => {
		// ControlEventHandler routes to the first strategy whose supports() is true, so
		// pin down that the prefix-partially-matching VertexInsertHandler / ConnectionAnchorEventHandler
		// do not grab it by mistake.
		const event = controlEvent("connector-vertex-insert:c:0");
		expect(vertexInsert.supports(event)).toBe(false);
		expect(connectionAnchor.supports(event)).toBe(false);
		// Reverse: this handler does not grab others' controls
		expect(insertHandler.supports(controlEvent("vertex-control:c:0"))).toBe(
			false,
		);
	});
});

describe("moving a connector waypoint via VertexControlHandler (reuse check)", () => {
	const moveHandler = new VertexControlHandler();

	it('can move a waypoint via a drag on "vertex-control:<connectorId>:<i>"', () => {
		const state = makeState([
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
		]);
		const event = {
			type: "drag",
			targetKind: "control",
			targetId: "vertex-control:conn-1:1",
			button: 0,
			last: { x: 120, y: 40 },
			mods: { shift: false, alt: false, ctrl: false, meta: false },
		} as unknown as CanvasEvent;

		const next = moveHandler.handle(state, event);
		expect(pointsOf(next)).toEqual([
			{ x: 0, y: 0 },
			{ x: 120, y: 40 },
		]);
	});
});
