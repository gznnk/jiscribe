import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import type { ConnectorLabel } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import type { Point } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { resolveConnectorLabelBox } from "../../../../../rendering/objects/connector/geometry/label/connectorLabelLayout";
import type { ConnectorState } from "../../../../../states/objects/connector/ConnectorState";
import { deepFreezeState } from "../../../../__tests__/support/deepFreezeState";
import type {
	CanvasControllerState,
	SnapCandidate,
	SnapCandidates,
} from "../../../../CanvasTypes";
import { createInitialControllerState } from "../../../../reducer/createInitialControllerState";
import { createTestRegistries } from "../../../../registries/createCanvasRegistries";
import { connectorLabelPartSelection } from "../../../../selection/__tests__/support/connectorLabelPartSelection";
import { selectionOf } from "../../../../selection/__tests__/support/selectionOf";
import { vertexPartSelection } from "../../../../selection/__tests__/support/vertexPartSelection";
import { reconcileSelection } from "../../../../selection/writers/reconcileSelection";
import type {
	CanvasEvent,
	EventType,
} from "../../../registry/GestureHandlerTypes";
import { SNAP_THRESHOLD_PX } from "../../utils/snap/findSnap";
import { ConnectorEventHandler } from "../ConnectorEventHandler";
import { ConnectorLabelDragHandler } from "../ConnectorLabelDragHandler";

const registries = createTestRegistries();

const emptyDoc: CanvasDoc = { version: 1, root: [] } as unknown as CanvasDoc;

/**
 * A straight connector between two free endpoints, so the resolved path is
 * exactly `source → target` with no owner geometry involved.
 * The default path is (0,0)-(200,0): its label anchor sits at (100, 0).
 */
const labeledConnector = (
	label: ConnectorLabel | undefined,
	source: Point = { x: 0, y: 0 },
	target: Point = { x: 200, y: 0 },
): ConnectorState =>
	({
		id: "c1",
		type: "connector",
		points: [],
		source: { anchor: { kind: "free", point: source } },
		target: { anchor: { kind: "free", point: target } },
		routing: "straight",
		stroke: "auto",
		strokeWidth: 2,
		...(label ? { label } : {}),
	}) as unknown as ConnectorState;

/** State holding the connector, plus the drag handleGesture would have opened over `snapCandidates`. */
const stateWith = (
	connector: ConnectorState,
	snapCandidates: SnapCandidates = { x: [], y: [] },
): CanvasControllerState => {
	const base = createInitialControllerState(emptyDoc, registries);
	const objects = { ...base.objects, [connector.id]: connector };
	return deepFreezeState({
		...base,
		objects,
		rootIds: [...base.rootIds, connector.id],
		drag: {
			kind: "inert",
			snapFeedback: null,
			axisLockFeedback: null,
			edgeScrollEnabled: false,
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
		},
	});
};

const dragEvent = (
	type: EventType,
	start: Point,
	last: Point,
	targetId = "c1",
): CanvasEvent =>
	({
		type,
		target: null,
		targetId,
		targetKind: "connector",
		targetAction: "label",
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

/** Same state viewed at `zoom`, which is what turns the screen-px threshold into world units. */
const withZoom = (
	state: CanvasControllerState,
	zoom: number,
): CanvasControllerState => ({
	...state,
	viewport: { ...state.viewport, zoom },
});

const labelOf = (state: CanvasControllerState, id = "c1") =>
	(state.objects[id] as ConnectorState).label;

describe("ConnectorLabelDragHandler - supports", () => {
	const supported: EventType[] = ["dragStart", "drag", "dragEnd"];
	const unsupported: EventType[] = [
		"pressed",
		"click",
		"doubleClick",
		"scroll",
		"zoom",
	];

	it("takes only left-button drags on the label box", () => {
		for (const type of supported) {
			expect(
				ConnectorLabelDragHandler.supports(
					dragEvent(type, { x: 0, y: 0 }, { x: 1, y: 1 }),
				),
			).toBe(true);
		}
		for (const type of unsupported) {
			expect(
				ConnectorLabelDragHandler.supports(
					dragEvent(type, { x: 0, y: 0 }, { x: 1, y: 1 }),
				),
			).toBe(false);
		}
	});

	it("ignores the bare line, other kinds, and non-left buttons", () => {
		const onLine = {
			...dragEvent("dragStart", { x: 0, y: 0 }, { x: 1, y: 1 }),
			targetAction: undefined,
		} as CanvasEvent;
		expect(ConnectorLabelDragHandler.supports(onLine)).toBe(false);

		const onObject = {
			...dragEvent("dragStart", { x: 0, y: 0 }, { x: 1, y: 1 }),
			targetKind: "object",
		} as CanvasEvent;
		expect(ConnectorLabelDragHandler.supports(onObject)).toBe(false);

		const rightButton = {
			...dragEvent("dragStart", { x: 0, y: 0 }, { x: 1, y: 1 }),
			button: 2,
		} as CanvasEvent;
		expect(ConnectorLabelDragHandler.supports(rightButton)).toBe(false);
	});
});

describe("ConnectorLabelDragHandler - dragStart", () => {
	it("selects the connector exclusively, picks its label, and enables edge scrolling", () => {
		const state = {
			...stateWith(labeledConnector({ text: "Yes" })),
			selection: selectionOf(["other"], vertexPartSelection(0)),
			objectMenuOpenId: "style",
			stencilLibraryOpenCategory: "flowchart",
			contextMenuPosition: { x: 1, y: 1 },
		} as unknown as CanvasControllerState;

		const next = ConnectorLabelDragHandler.handle(
			state,
			dragEvent("dragStart", { x: 100, y: 0 }, { x: 100, y: 0 }),
			registries,
		);

		expect(next.selection.objectIds).toEqual(["c1"]);
		expect(next.selection.part).toEqual(connectorLabelPartSelection());
		// The pick survives the reconcile every gesture result goes through.
		expect(reconcileSelection(next, registries.objectPartKind).selection).toBe(
			next.selection,
		);
		expect(next.multiSelectGroup).toBeNull();
		expect(next.objectMenuOpenId).toBeNull();
		expect(next.stencilLibraryOpenCategory).toBeNull();
		expect(next.contextMenuPosition).toBeNull();
		expect(next.drag?.edgeScrollEnabled).toBe(true);
		expect(next.drag?.kind).toBe("label");
	});

	it("does not select a connector that has no label box to grab", () => {
		const next = ConnectorLabelDragHandler.handle(
			stateWith(labeledConnector({ text: "" })),
			dragEvent("dragStart", { x: 100, y: 0 }, { x: 100, y: 0 }),
			registries,
		);
		expect(next.selection.objectIds).toEqual([]);
		expect(next.drag?.kind).toBe("inert");
	});
	it("has the router commit an open label edit into the snapshot, so the next frame keeps its text (touch)", () => {
		// A touch press waits to see whether it becomes a pinch, so the edit is
		// still open when the drag starts.
		const state = {
			...stateWith(labeledConnector({ text: "Yes" })),
			selection: selectionOf(["c1"]),
			mode: {
				kind: "textEdit",
				draft: { kind: "connectorLabel", text: "No" },
			},
		} as unknown as CanvasControllerState;
		const touch = (event: CanvasEvent): CanvasEvent =>
			({ ...event, pointerType: "touch" }) as CanvasEvent;

		const started = ConnectorEventHandler.handle(
			state,
			touch(dragEvent("dragStart", { x: 100, y: 0 }, { x: 100, y: 0 })),
			registries,
		);
		expect(started.mode.kind).toBe("normal");
		expect(labelOf(started)?.text).toBe("No");
		expect(started.drag?.kind).toBe("label");

		const dragged = ConnectorEventHandler.handle(
			started,
			touch(dragEvent("drag", { x: 100, y: 0 }, { x: 150, y: 0 })),
			registries,
		);
		expect(labelOf(dragged)).toMatchObject({ text: "No", position: 0.75 });
	});
});

describe("ConnectorLabelDragHandler - drag", () => {
	it("converts the cursor into a position ratio along the path", () => {
		const state = stateWith(labeledConnector({ text: "Yes" }));
		const next = ConnectorLabelDragHandler.handle(
			state,
			dragEvent("drag", { x: 100, y: 0 }, { x: 150, y: 0 }),
			registries,
		);
		expect(labelOf(next)).toEqual({ text: "Yes", position: 0.75 });
	});

	it("converts a sideways cursor into a signed perpendicular offset", () => {
		const state = stateWith(labeledConnector({ text: "Yes" }));
		const next = ConnectorLabelDragHandler.handle(
			state,
			dragEvent("drag", { x: 100, y: 0 }, { x: 150, y: 20 }),
			registries,
		);
		expect(labelOf(next)).toEqual({
			text: "Yes",
			position: 0.75,
			offset: 20,
		});
	});

	it("corrects for the grab offset so a corner grab does not snap the label to the cursor", () => {
		const state = stateWith(labeledConnector({ text: "Yes" }));
		// Grabbed 10px right / 5px below the anchor, then moved to (160, 25):
		// the anchor should land on (150, 20), the same as a centered grab would.
		const next = ConnectorLabelDragHandler.handle(
			state,
			dragEvent("drag", { x: 110, y: 5 }, { x: 160, y: 25 }),
			registries,
		);
		expect(labelOf(next)).toEqual({
			text: "Yes",
			position: 0.75,
			offset: 20,
		});
	});

	it("clamps position into [0, 1] when dragged past an end", () => {
		const state = stateWith(labeledConnector({ text: "Yes" }));
		const next = ConnectorLabelDragHandler.handle(
			state,
			dragEvent("drag", { x: 100, y: 0 }, { x: 900, y: 0 }),
			registries,
		);
		expect(labelOf(next)).toEqual({ text: "Yes", position: 1 });
	});

	it("prunes placement keys that land back on their default", () => {
		const state = stateWith(
			labeledConnector({ text: "Yes", position: 0.75, offset: 20 }),
		);
		// Grabbing the moved label at its anchor (150, 20) and dropping it on the midpoint.
		const next = ConnectorLabelDragHandler.handle(
			state,
			dragEvent("drag", { x: 150, y: 20 }, { x: 100, y: 0 }),
			registries,
		);
		expect(labelOf(next)).toEqual({ text: "Yes" });
	});

	it("keeps the label's style keys", () => {
		const state = stateWith(
			labeledConnector({ text: "Yes", fill: "#dc2626", fontWeight: "bold" }),
		);
		const next = ConnectorLabelDragHandler.handle(
			state,
			dragEvent("drag", { x: 100, y: 0 }, { x: 150, y: 0 }),
			registries,
		);
		expect(labelOf(next)).toEqual({
			text: "Yes",
			fill: "#dc2626",
			fontWeight: "bold",
			position: 0.75,
		});
	});

	it("measures every frame against the snapshot, not the previous frame", () => {
		const state = stateWith(labeledConnector({ text: "Yes" }));
		const frame1 = ConnectorLabelDragHandler.handle(
			state,
			dragEvent("drag", { x: 100, y: 0 }, { x: 150, y: 0 }),
			registries,
		);
		const frame2 = ConnectorLabelDragHandler.handle(
			frame1,
			dragEvent("drag", { x: 100, y: 0 }, { x: 120, y: 0 }),
			registries,
		);
		// Cumulative application would land on 0.85 (0.75 + 0.1); snapshot-based lands on 0.6.
		expect(labelOf(frame2)).toEqual({ text: "Yes", position: 0.6 });
	});

	it("leaves the state alone when the connector, the label, or the snapshot is missing", () => {
		const withLabel = stateWith(labeledConnector({ text: "Yes" }));
		expect(
			ConnectorLabelDragHandler.handle(
				withLabel,
				dragEvent("drag", { x: 100, y: 0 }, { x: 150, y: 0 }, "missing"),
				registries,
			),
		).toBe(withLabel);

		const withoutLabel = stateWith(labeledConnector(undefined));
		expect(
			ConnectorLabelDragHandler.handle(
				withoutLabel,
				dragEvent("drag", { x: 100, y: 0 }, { x: 150, y: 0 }),
				registries,
			),
		).toBe(withoutLabel);

		const withoutSnapshot = {
			...withLabel,
			drag: null,
		} as CanvasControllerState;
		expect(
			ConnectorLabelDragHandler.handle(
				withoutSnapshot,
				dragEvent("drag", { x: 100, y: 0 }, { x: 150, y: 0 }),
				registries,
			),
		).toBe(withoutSnapshot);
	});

	it("leaves the state alone for a degenerate path with no length", () => {
		const degenerate = stateWith(
			labeledConnector({ text: "Yes" }, { x: 5, y: 5 }, { x: 5, y: 5 }),
		);
		expect(
			ConnectorLabelDragHandler.handle(
				degenerate,
				dragEvent("drag", { x: 5, y: 5 }, { x: 60, y: 5 }),
				registries,
			),
		).toBe(degenerate);
	});
});

describe("ConnectorLabelDragHandler - offset snap", () => {
	/** Drops the label at (150, offset) on the default (0,0)-(200,0) path. */
	const dropBeside = (
		state: CanvasControllerState,
		offset: number,
		mods: "none" | "ctrl" = "none",
	) => {
		const event = dragEvent("drag", { x: 100, y: 0 }, { x: 150, y: offset });
		return labelOf(
			ConnectorLabelDragHandler.handle(
				state,
				mods === "ctrl" ? withCtrl(event) : event,
				registries,
			),
		);
	};

	it("pulls an offset inside the threshold onto the line, dropping the key", () => {
		const label = dropBeside(
			stateWith(labeledConnector({ text: "Yes" })),
			SNAP_THRESHOLD_PX - 2,
		);
		expect(label).toEqual({ text: "Yes", position: 0.75 });
		expect(label).not.toHaveProperty("offset");
	});

	it("pulls a negative offset onto the line as well", () => {
		expect(
			dropBeside(
				stateWith(labeledConnector({ text: "Yes" })),
				-(SNAP_THRESHOLD_PX - 2),
			),
		).toEqual({ text: "Yes", position: 0.75 });
	});

	it("keeps an offset that reaches the threshold", () => {
		expect(
			dropBeside(
				stateWith(labeledConnector({ text: "Yes" })),
				SNAP_THRESHOLD_PX,
			),
		).toEqual({ text: "Yes", position: 0.75, offset: SNAP_THRESHOLD_PX });
	});

	it("measures the threshold in screen pixels, so zoom 2 halves it in world units", () => {
		const state = stateWith(labeledConnector({ text: "Yes" }));
		const offset = SNAP_THRESHOLD_PX - 2;
		// The same world offset that snaps at zoom 1 is beyond the threshold at zoom 2.
		expect(dropBeside(withZoom(state, 2), offset)).toEqual({
			text: "Yes",
			position: 0.75,
			offset,
		});
		expect(dropBeside(withZoom(state, 2), offset / 4)).toEqual({
			text: "Yes",
			position: 0.75,
		});
	});

	it("bypasses the snap while Ctrl is held", () => {
		const offset = SNAP_THRESHOLD_PX - 2;
		expect(
			dropBeside(stateWith(labeledConnector({ text: "Yes" })), offset, "ctrl"),
		).toEqual({ text: "Yes", position: 0.75, offset });
	});
});

describe("ConnectorLabelDragHandler - dragEnd", () => {
	it("applies the final frame", () => {
		const state = stateWith(labeledConnector({ text: "Yes" }));
		const afterStart = ConnectorLabelDragHandler.handle(
			state,
			dragEvent("dragStart", { x: 100, y: 0 }, { x: 100, y: 0 }),
			registries,
		);
		const afterEnd = ConnectorLabelDragHandler.handle(
			afterStart,
			dragEvent("dragEnd", { x: 100, y: 0 }, { x: 50, y: -10 }),
			registries,
		);

		expect(labelOf(afterEnd)).toEqual({
			text: "Yes",
			position: 0.25,
			offset: -10,
		});
		expect(afterEnd.objects).not.toBe(afterStart.objects);
		expect(afterEnd.commitVersion).toBe(afterStart.commitVersion + 1);
	});

	it("keeps the objects reference and commits nothing when the label ends where it started", () => {
		const state = stateWith(labeledConnector({ text: "Yes" }));
		const afterStart = ConnectorLabelDragHandler.handle(
			state,
			dragEvent("dragStart", { x: 100, y: 0 }, { x: 100, y: 0 }),
			registries,
		);
		const afterDrag = ConnectorLabelDragHandler.handle(
			afterStart,
			dragEvent("drag", { x: 100, y: 0 }, { x: 100, y: 0 }),
			registries,
		);
		const afterEnd = ConnectorLabelDragHandler.handle(
			afterDrag,
			dragEvent("dragEnd", { x: 100, y: 0 }, { x: 100, y: 0 }),
			registries,
		);

		expect(afterEnd.objects).toBe(afterDrag.objects);
		expect(afterEnd.commitVersion).toBe(afterDrag.commitVersion);
	});

	it("commits the final frame when the last drag frame held a different placement (Ctrl released before release)", () => {
		const state = stateWith(labeledConnector({ text: "Yes" }));
		const afterStart = ConnectorLabelDragHandler.handle(
			state,
			dragEvent("dragStart", { x: 100, y: 0 }, { x: 100, y: 0 }),
			registries,
		);
		// Ctrl bypasses the snap, so the drag frame keeps the sub-threshold offset.
		const afterDrag = ConnectorLabelDragHandler.handle(
			afterStart,
			withCtrl(dragEvent("drag", { x: 100, y: 0 }, { x: 100, y: 3 })),
			registries,
		);
		expect(labelOf(afterDrag)).toEqual({ text: "Yes", offset: 3 });

		// Released without Ctrl at the same point: the snap pulls it back to the start.
		const afterEnd = ConnectorLabelDragHandler.handle(
			afterDrag,
			dragEvent("dragEnd", { x: 100, y: 0 }, { x: 100, y: 3 }),
			registries,
		);

		expect(labelOf(afterEnd)).toEqual({ text: "Yes" });
		expect(labelOf(afterEnd)).not.toHaveProperty("offset");
		expect(afterEnd.objects).not.toBe(afterDrag.objects);
		expect(afterEnd.commitVersion).toBe(afterDrag.commitVersion + 1);
	});

	it("commits the final frame when a flick's last drag frame stayed off the line", () => {
		const state = stateWith(labeledConnector({ text: "Yes" }));
		const afterStart = ConnectorLabelDragHandler.handle(
			state,
			dragEvent("dragStart", { x: 100, y: 0 }, { x: 100, y: 0 }),
			registries,
		);
		const afterDrag = ConnectorLabelDragHandler.handle(
			afterStart,
			dragEvent("drag", { x: 100, y: 0 }, { x: 100, y: 20 }),
			registries,
		);
		expect(labelOf(afterDrag)).toEqual({ text: "Yes", offset: 20 });

		// The move back and the pointerup coalesced into the dragEnd frame, which
		// lands inside the snap threshold and so equals the starting placement.
		const afterEnd = ConnectorLabelDragHandler.handle(
			afterDrag,
			dragEvent("dragEnd", { x: 100, y: 0 }, { x: 100, y: 3 }),
			registries,
		);

		expect(labelOf(afterEnd)).toEqual({ text: "Yes" });
		expect(labelOf(afterEnd)).not.toHaveProperty("offset");
		expect(afterEnd.objects).not.toBe(afterDrag.objects);
		expect(afterEnd.commitVersion).toBe(afterDrag.commitVersion + 1);
	});
});

describe("ConnectorLabelDragHandler - midpoint snap", () => {
	it("pulls a position near the middle of the path onto it, beside the line too", () => {
		const next = ConnectorLabelDragHandler.handle(
			stateWith(labeledConnector({ text: "Yes" })),
			// 4 along the path from the middle (100), 20 beside it.
			dragEvent("drag", { x: 100, y: 0 }, { x: 104, y: 20 }),
			registries,
		);
		expect(labelOf(next)).toEqual({ text: "Yes", offset: 20 });
	});

	it("pulls a position near the middle of one segment onto it", () => {
		// (0,0)-(200,0)-(200,200): the first segment's middle is at 0.25.
		const connector = {
			...labeledConnector({ text: "Yes" }),
			points: [{ x: 200, y: 0 }],
			target: { anchor: { kind: "free", point: { x: 200, y: 200 } } },
		} as unknown as ConnectorState;
		const next = ConnectorLabelDragHandler.handle(
			stateWith(connector),
			// Grabbed at the anchor (200, 0) and dropped 5 past the first leg's middle.
			dragEvent("drag", { x: 200, y: 0 }, { x: 105, y: 0 }),
			registries,
		);
		expect(labelOf(next)).toEqual({ text: "Yes", position: 0.25 });
	});

	it("bypasses the snap while Ctrl is held", () => {
		const next = ConnectorLabelDragHandler.handle(
			stateWith(labeledConnector({ text: "Yes" })),
			withCtrl(dragEvent("drag", { x: 100, y: 0 }, { x: 104, y: 20 })),
			registries,
		);
		expect(labelOf(next)).toEqual({ text: "Yes", position: 0.52, offset: 20 });
	});
});

describe("ConnectorLabelDragHandler - alignment to other objects", () => {
	const LABEL_BOX = resolveConnectorLabelBox({ text: "Yes" });

	const xCandidate = (coordinate: number): SnapCandidate => ({
		objectId: "r1",
		coordinate,
		edge: "left",
		perpendicularMin: 100,
		perpendicularMax: 140,
	});
	const yCandidate = (coordinate: number): SnapCandidate => ({
		objectId: "r1",
		coordinate,
		edge: "top",
		perpendicularMin: 300,
		perpendicularMax: 340,
	});

	/** Drags the label from the path's middle so its anchor lands on `anchor`, over the given candidates. */
	const dragTo = (
		anchor: Point,
		snapCandidates: SnapCandidates,
		mods: "none" | "ctrl" = "none",
	): CanvasControllerState => {
		const event = dragEvent("drag", { x: 100, y: 0 }, anchor);
		return ConnectorLabelDragHandler.handle(
			stateWith(labeledConnector({ text: "Yes" }), snapCandidates),
			mods === "ctrl" ? withCtrl(event) : event,
			registries,
		);
	};

	it("on a horizontal line snapped onto it, takes the x alignment and refuses the y one", () => {
		// The box's right edge 3 short of an x candidate, its top 4 below a y one.
		const next = dragTo(
			{ x: 60, y: 2 },
			{
				x: [xCandidate(60 + LABEL_BOX.width / 2 + 3)],
				y: [yCandidate(-LABEL_BOX.height / 2 - 4)],
			},
		);
		// x moves along the line (60 → 63); y would lift it off, so the line wins.
		expect(labelOf(next)).toEqual({ text: "Yes", position: 0.315 });
		expect(next.drag?.snapFeedback?.x.map((guide) => guide.coordinate)).toEqual(
			[60 + LABEL_BOX.width / 2 + 3],
		);
		expect(next.drag?.snapFeedback?.y).toEqual([]);
	});

	it("takes the y alignment while the label sits beside the line", () => {
		// The box's bottom edge 3 short of a y candidate.
		const next = dragTo(
			{ x: 60, y: 30 },
			{ x: [], y: [yCandidate(30 + LABEL_BOX.height / 2 + 3)] },
		);
		expect(labelOf(next)).toEqual({ text: "Yes", position: 0.3, offset: 33 });
		expect(next.drag?.snapFeedback?.x).toEqual([]);
		expect(next.drag?.snapFeedback?.y.map((guide) => guide.coordinate)).toEqual(
			[30 + LABEL_BOX.height / 2 + 3],
		);
	});

	it("takes both axes when neither undoes a path snap", () => {
		const next = dragTo(
			{ x: 60, y: 30 },
			{
				x: [xCandidate(60 + LABEL_BOX.width / 2 + 3)],
				y: [yCandidate(30 + LABEL_BOX.height / 2 + 3)],
			},
		);
		expect(labelOf(next)).toEqual({ text: "Yes", position: 0.315, offset: 33 });
		expect(next.drag?.snapFeedback?.x).toHaveLength(1);
		expect(next.drag?.snapFeedback?.y).toHaveLength(1);
	});

	it("refuses an x alignment that would pull the label off the midpoint it snapped to", () => {
		// 2 past the middle (snapped back onto it), the box's right edge then 3 short of a candidate.
		const next = dragTo(
			{ x: 102, y: 20 },
			{ x: [xCandidate(100 + LABEL_BOX.width / 2 + 3)], y: [] },
		);
		expect(labelOf(next)).toEqual({ text: "Yes", offset: 20 });
		expect(next.drag?.snapFeedback).toEqual({ x: [], y: [] });
	});

	it("bypasses the alignment while Ctrl is held, writing no guides", () => {
		const next = dragTo(
			{ x: 60, y: 30 },
			{
				x: [xCandidate(60 + LABEL_BOX.width / 2 + 3)],
				y: [yCandidate(30 + LABEL_BOX.height / 2 + 3)],
			},
			"ctrl",
		);
		expect(labelOf(next)).toEqual({ text: "Yes", position: 0.3, offset: 30 });
		expect(next.drag?.snapFeedback).toEqual({ x: [], y: [] });
	});

	it("clears the previous frame's guides on a frame that aligns nothing", () => {
		const snapCandidates = {
			x: [xCandidate(60 + LABEL_BOX.width / 2 + 3)],
			y: [],
		};
		const state = stateWith(labeledConnector({ text: "Yes" }), snapCandidates);
		const aligned = ConnectorLabelDragHandler.handle(
			state,
			dragEvent("drag", { x: 100, y: 0 }, { x: 60, y: 30 }),
			registries,
		);
		expect(aligned.drag?.snapFeedback?.x).toHaveLength(1);

		const unaligned = ConnectorLabelDragHandler.handle(
			aligned,
			dragEvent("drag", { x: 100, y: 0 }, { x: 160, y: 30 }),
			registries,
		);
		expect(unaligned.drag?.snapFeedback).toEqual({ x: [], y: [] });
	});
});
