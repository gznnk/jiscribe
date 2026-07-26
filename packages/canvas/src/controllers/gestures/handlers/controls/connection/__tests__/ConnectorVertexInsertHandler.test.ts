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
	targetPart: string | undefined,
	targetKind = "control",
): CanvasEvent =>
	({
		type: "dragStart",
		targetKind,
		targetId,
		targetPart,
		button: 0,
	}) as unknown as CanvasEvent;

const makeConnector = (id: string, points: Point[]) =>
	({
		id,
		type: "connector",
		points,
		source: { owner: { id: "a" }, anchor: { kind: "center" } },
		target: { owner: { id: "b" }, anchor: { kind: "center" } },
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
		targetId: "conn-1",
		targetPart: `waypoint-insert:${segmentIndex}`,
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

	// Non-left buttons never reach the strategies: ControlEventHandler.supports
	// requires button === 0, pinned by the routing-exclusivity test (#110).

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

	it("supports only waypoint-insert: control events", () => {
		expect(insertHandler.supports(controlEvent("c", "waypoint-insert:0"))).toBe(
			true,
		);
		expect(insertHandler.supports(controlEvent("c", "vertex-insert:0"))).toBe(
			false,
		);
		expect(insertHandler.supports(controlEvent("c", "endpoint:source"))).toBe(
			false,
		);
		expect(insertHandler.supports(controlEvent("c", undefined))).toBe(false);
		expect(
			insertHandler.supports(controlEvent("c", "waypoint-insert:0", "object")),
		).toBe(false);
	});

	it("sibling handlers with confusing part subtypes do not steal waypoint-insert", () => {
		// ControlEventHandler routes to the first strategy whose supports() is true, so
		// pin down that VertexInsertHandler / ConnectionAnchorEventHandler
		// do not grab it by mistake.
		const event = controlEvent("c", "waypoint-insert:0");
		expect(vertexInsert.supports(event)).toBe(false);
		expect(connectionAnchor.supports(event)).toBe(false);
		// Reverse: this handler does not grab others' controls
		expect(insertHandler.supports(controlEvent("c", "vertex:0"))).toBe(false);
	});
});

describe("moving a connector waypoint via VertexControlHandler (reuse check)", () => {
	const moveHandler = new VertexControlHandler();

	it('can move a waypoint via a drag on data-id=<connectorId> + data-part="vertex:<i>"', () => {
		const state = makeState([
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
		]);
		const event = {
			type: "drag",
			targetKind: "control",
			targetId: "conn-1",
			targetPart: "vertex:1",
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

describe("ConnectorVertexInsertHandler - doubleClick starts label editing", () => {
	/** State whose connector carries a committed label. */
	const makeLabeledState = (labelText: string): CanvasControllerState => {
		const state = makeState([]);
		const connector = state.objects["conn-1"] as unknown as {
			label?: { text: string };
		};
		connector.label = { text: labelText };
		return state;
	};

	/** doubleClick on the waypoint-insert handle, with a stubbed hover stack. */
	const doubleClickEvent = (
		hovered: { id: string; kind: string; part?: string }[],
	): CanvasEvent =>
		({
			type: "doubleClick",
			targetKind: "control",
			targetId: "conn-1",
			targetPart: "waypoint-insert:0",
			button: 0,
			last: { x: 50, y: 50 },
			getHovered: () => hovered,
			mods: { shift: false, alt: false, ctrl: false, meta: false },
		}) as unknown as CanvasEvent;

	it("without a label, opens the editor empty (a double click aimed at the line landing on the handle)", () => {
		const next = insertHandler.handle(makeState([]), doubleClickEvent([]));
		expect(next.textEditState).toEqual({
			kind: "connectorLabel",
			objectId: "conn-1",
			text: "",
		});
		// No waypoint is inserted by the double click
		expect(pointsOf(next)).toEqual([]);
	});

	it("with a committed label whose box is in the hover stack, opens the editor prefilled (the handle covers the default midpoint placement)", () => {
		const next = insertHandler.handle(
			makeLabeledState("Yes"),
			doubleClickEvent([{ id: "conn-1", kind: "connector", part: "label" }]),
		);
		expect(next.textEditState).toEqual({
			kind: "connectorLabel",
			objectId: "conn-1",
			text: "Yes",
		});
	});

	it("with a committed label elsewhere (box not in the hover stack), selects without opening the editor", () => {
		const next = insertHandler.handle(
			makeLabeledState("Yes"),
			doubleClickEvent([]),
		);
		expect(next.textEditState).toBeUndefined();
		expect(next.selectedConnectorId).toBe("conn-1");
	});

	it("a hover stack entry of another connector's label does not count as a label hit", () => {
		const next = insertHandler.handle(
			makeLabeledState("Yes"),
			doubleClickEvent([{ id: "conn-2", kind: "connector", part: "label" }]),
		);
		expect(next.textEditState).toBeUndefined();
	});
});
