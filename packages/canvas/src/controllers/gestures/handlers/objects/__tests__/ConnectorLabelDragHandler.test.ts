import type { Point } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../../../../schemas/canvas/CanvasDoc";
import type { ConnectorLabel } from "../../../../../schemas/objects/connector/ConnectorDoc";
import type { ConnectorState } from "../../../../../states/objects/connector/ConnectorState";
import { deepFreezeState } from "../../../../__tests__/support/deepFreezeState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { createInitialControllerState } from "../../../../reducer/createInitialControllerState";
import { createTestRegistries } from "../../../../registries/createCanvasRegistries";
import type {
	CanvasEvent,
	EventType,
} from "../../../registry/GestureHandlerTypes";
import { SNAP_THRESHOLD_PX } from "../../utils/snap/findSnap";
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

/** State holding the connector, plus the eventStartSnapshot handleGesture would have taken. */
const stateWith = (connector: ConnectorState): CanvasControllerState => {
	const base = createInitialControllerState(emptyDoc, registries);
	const objects = { ...base.objects, [connector.id]: connector };
	return deepFreezeState({
		...base,
		objects,
		rootIds: [...base.rootIds, connector.id],
		eventStartSnapshot: {
			objects,
			keyPoints: {},
			bboxes: {},
			snapCandidates: { x: [], y: [] },
			selectedIds: [],
			selectedIdsWithDescendants: new Set(),
			multiSelectGroup: null,
			viewport: base.viewport,
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
		targetPart: "label",
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
			targetPart: undefined,
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
	it("selects the connector exclusively and enables edge scrolling", () => {
		const state = {
			...stateWith(labeledConnector({ text: "Yes" })),
			selectedIds: ["other"],
			selectedVertex: { objectId: "other", vertexIndex: 0 },
			objectMenuOpenId: "style",
			stencilLibraryOpenCategory: "flowchart",
			contextMenuPosition: { x: 1, y: 1 },
		} as unknown as CanvasControllerState;

		const next = ConnectorLabelDragHandler.handle(
			state,
			dragEvent("dragStart", { x: 100, y: 0 }, { x: 100, y: 0 }),
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

	it("does not select a connector that has no label box to grab", () => {
		const next = ConnectorLabelDragHandler.handle(
			stateWith(labeledConnector({ text: "" })),
			dragEvent("dragStart", { x: 100, y: 0 }, { x: 100, y: 0 }),
			registries,
		);
		expect(next.selectedConnectorId).toBeNull();
		expect(next.edgeScrollEnabled).toBe(false);
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
			eventStartSnapshot: null,
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
	it("applies the final frame and disables edge scrolling", () => {
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
		expect(afterEnd.edgeScrollEnabled).toBe(false);
	});

	it("keeps the objects reference when the label ends where it started (no history entry)", () => {
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
		expect(afterEnd.edgeScrollEnabled).toBe(false);
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
	});
});
