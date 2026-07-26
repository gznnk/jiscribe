import type { Point } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import { CONNECTOR_HIT_STROKE_WIDTH } from "../../../../../constants/connectorHitArea";
import type { ConnectorLabel } from "../../../../../schemas/objects/connections/connector/ConnectorDoc";
import type { ConnectorState } from "../../../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { createTestRegistries } from "../../../../registries/createCanvasRegistries";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { SNAP_THRESHOLD_PX } from "../../utils/snap/findSnap";
import { ConnectorEventHandler } from "../ConnectorEventHandler";

const registries = createTestRegistries();

/** Endpoints reference absent objects, so the path never resolves (placement stays out of it). */
const makeConnector = (id: string, labelText: string): ConnectorState =>
	({
		id,
		type: "connector",
		source: { owner: { id: "a" }, anchor: { kind: "center" } },
		target: { owner: { id: "b" }, anchor: { kind: "center" } },
		label: { text: labelText },
	}) as unknown as ConnectorState;

/** State with two connectors and no active edit session. */
const makeState = (labelText: string): CanvasControllerState =>
	({
		objects: {
			c1: makeConnector("c1", labelText),
			c2: makeConnector("c2", "other"),
		},
		rootIds: ["c1", "c2"],
		selectedIds: [],
		selectedConnectorId: null,
		selectedVertex: null,
		multiSelectGroup: null,
		textEditState: null,
		commitVersion: 5,
		contextMenuPosition: { x: 1, y: 1 },
		viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
	}) as unknown as CanvasControllerState;

/** State while editing `editingId`'s label, with a pending (uncommitted) `pendingText`. */
const makeEditState = (
	editingId: string,
	labelText: string,
	pendingText: string,
): CanvasControllerState =>
	({
		...makeState(labelText),
		selectedConnectorId: editingId,
		textEditState: {
			kind: "connectorLabel",
			objectId: editingId,
			text: pendingText,
		},
	}) as unknown as CanvasControllerState;

const makeEvent = (
	type: "pressed" | "click" | "doubleClick",
	targetId: string,
	targetPart?: string,
	last: Point = { x: 0, y: 0 },
): CanvasEvent =>
	({
		type,
		targetKind: "connector",
		targetId,
		targetPart,
		start: last,
		last,
		button: 0,
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

const labelText = (state: CanvasControllerState, id: string) =>
	(state.objects[id] as ConnectorState).label?.text;

/** The pending placement carried by the label editing session, if any. */
const pendingPlacement = (state: CanvasControllerState) =>
	state.textEditState?.kind === "connectorLabel"
		? state.textEditState.placement
		: undefined;

describe("ConnectorEventHandler - double click edit target", () => {
	it("with a committed label, a double click on the bare line selects without opening the editor", () => {
		const next = ConnectorEventHandler.handle(
			makeState("Yes"),
			makeEvent("doubleClick", "c1"),
			registries,
		);
		expect(next.textEditState).toBeNull();
		expect(next.selectedConnectorId).toBe("c1");
	});

	it("with a committed label, a double click on the label box opens the editor prefilled", () => {
		const next = ConnectorEventHandler.handle(
			makeState("Yes"),
			makeEvent("doubleClick", "c1", "label"),
			registries,
		);
		expect(next.textEditState).toEqual({
			kind: "connectorLabel",
			objectId: "c1",
			text: "Yes",
		});
		expect(next.selectedConnectorId).toBe("c1");
	});

	it("without a label, a double click anywhere on the line opens the editor empty", () => {
		const next = ConnectorEventHandler.handle(
			makeState(""),
			makeEvent("doubleClick", "c1"),
			registries,
		);
		expect(next.textEditState).toEqual({
			kind: "connectorLabel",
			objectId: "c1",
			text: "",
		});
		expect(next.selectedConnectorId).toBe("c1");
	});
});

describe("ConnectorEventHandler - placement of the label being created", () => {
	/**
	 * A straight connector between two free endpoints, so the resolved path is
	 * exactly (0,0)-(200,0) with no owner geometry involved.
	 */
	const freeConnector = (label?: ConnectorLabel): ConnectorState =>
		({
			id: "c1",
			type: "connector",
			points: [],
			source: { anchor: { kind: "free", point: { x: 0, y: 0 } } },
			target: { anchor: { kind: "free", point: { x: 200, y: 0 } } },
			routing: "straight",
			...(label ? { label } : {}),
		}) as unknown as ConnectorState;

	const stateWith = (label?: ConnectorLabel): CanvasControllerState =>
		({
			...makeState(""),
			objects: { c1: freeConnector(label) },
		}) as unknown as CanvasControllerState;

	const dblclickAt = (
		state: CanvasControllerState,
		last: Point,
		targetPart?: string,
	) =>
		ConnectorEventHandler.handle(
			state,
			makeEvent("doubleClick", "c1", targetPart, last),
			registries,
		);

	it("projects the clicked point onto the path", () => {
		const next = dblclickAt(stateWith(), { x: 150, y: 0 });
		expect(next.textEditState).toEqual({
			kind: "connectorLabel",
			objectId: "c1",
			text: "",
			placement: { position: 0.75, offset: 0 },
		});
	});

	it("snaps a click beside the line onto it, as the label drag does", () => {
		const next = dblclickAt(stateWith(), { x: 150, y: SNAP_THRESHOLD_PX - 2 });
		expect(pendingPlacement(next)).toEqual({
			position: 0.75,
			offset: 0,
		});
	});

	it("keeps an offset that reaches the threshold, beyond the reach of a real click on the hit band", () => {
		const next = dblclickAt(stateWith(), { x: 150, y: SNAP_THRESHOLD_PX });
		expect(pendingPlacement(next)).toEqual({
			position: 0.75,
			offset: SNAP_THRESHOLD_PX,
		});
	});

	it("snaps a click anywhere in the hit band even when the zoom shrinks the threshold", () => {
		// zoom 2 puts the zoom-scaled threshold (4) inside the hit band's half
		// width (6), which would otherwise leave the label floating off the line.
		const zoomed = {
			...stateWith(),
			viewport: { ...stateWith().viewport, zoom: 2 },
		} as CanvasControllerState;
		const next = dblclickAt(zoomed, {
			x: 150,
			y: CONNECTOR_HIT_STROKE_WIDTH / 2 - 0.5,
		});
		expect(pendingPlacement(next)).toEqual({ position: 0.75, offset: 0 });
	});

	it("measures the position along the same path the rendering resolves", () => {
		// A cloud 200x100 centered on the origin: its registered outline puts the
		// center-anchored endpoint on the bump at (75, 0), while the bounding-box
		// fallback would put it at (100, 0) and read the click as position 0.5.
		const cloud = {
			id: "cl1",
			type: "cloud",
			features: { type: "cloud", geometry: "rect" },
			cx: 0,
			cy: 0,
			width: 200,
			height: 100,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
		};
		const attached = {
			...freeConnector(),
			source: { owner: { id: "cl1" }, anchor: { kind: "center" } },
			target: { anchor: { kind: "free", point: { x: 500, y: 0 } } },
		};
		const state = {
			...makeState(""),
			objects: { cl1: cloud, c1: attached },
		} as unknown as CanvasControllerState;

		const next = dblclickAt(state, { x: 300, y: 0 });

		expect(pendingPlacement(next)?.position).toBeCloseTo(225 / 425, 5);
	});

	it("writes nothing to the connector until the edit is committed", () => {
		const state = stateWith();
		const next = dblclickAt(state, { x: 150, y: 0 });
		expect(next.objects).toBe(state.objects);
	});

	it("overrides the placement left on an emptied label by an external document", () => {
		const next = dblclickAt(
			stateWith({ text: "", position: 0.2, offset: 30, fill: "#dc2626" }),
			{ x: 150, y: 0 },
		);
		expect(pendingPlacement(next)).toEqual({ position: 0.75, offset: 0 });
	});

	it("carries no placement when an existing label is edited from its box", () => {
		const next = dblclickAt(
			stateWith({ text: "Yes" }),
			{ x: 150, y: 0 },
			"label",
		);
		expect(next.textEditState).toEqual({
			kind: "connectorLabel",
			objectId: "c1",
			text: "Yes",
		});
		expect(pendingPlacement(next)).toBeUndefined();
	});
});

describe("ConnectorEventHandler - taps while editing commit", () => {
	it("a pressed on the edited connector's line commits the pending label (the label box itself is covered by the editor overlay)", () => {
		const next = ConnectorEventHandler.handle(
			makeEditState("c1", "old", "new"),
			makeEvent("pressed", "c1"),
			registries,
		);
		expect(labelText(next, "c1")).toBe("new");
		expect(next.textEditState).toBeNull();
		expect(next.commitVersion).toBe(6);
	});

	it("a double click on the edited connector's line commits once and does not re-open the editor", () => {
		const afterPressed = ConnectorEventHandler.handle(
			makeEditState("c1", "old", "new"),
			makeEvent("pressed", "c1"),
			registries,
		);
		const afterDouble = ConnectorEventHandler.handle(
			afterPressed,
			makeEvent("doubleClick", "c1"),
			registries,
		);
		// Exactly one commit (from the pressed); the committed label now exists,
		// so the line double click only selects.
		expect(labelText(afterDouble, "c1")).toBe("new");
		expect(afterDouble.textEditState).toBeNull();
		expect(afterDouble.commitVersion).toBe(6);
		expect(afterDouble.selectedConnectorId).toBe("c1");
	});

	it("a pressed on a different connector commits the pending edit", () => {
		const next = ConnectorEventHandler.handle(
			makeEditState("c1", "old", "new"),
			makeEvent("pressed", "c2"),
			registries,
		);
		// The edit is committed to c1 and the session is cleared.
		expect(labelText(next, "c1")).toBe("new");
		expect(next.textEditState).toBeNull();
		expect(next.commitVersion).toBe(6);
	});
});

describe("ConnectorEventHandler - clears stale UI state on selection change", () => {
	const staleUiState = (): CanvasControllerState =>
		({
			...makeState("Yes"),
			selectedVertex: { objectId: "c2", vertexIndex: 0 },
			objectMenuOpenId: "style",
			stencilLibraryOpenCategory: "flowchart",
		}) as unknown as CanvasControllerState;

	it("a click selecting a connector closes the menus and drops the vertex selection", () => {
		const next = ConnectorEventHandler.handle(
			staleUiState(),
			makeEvent("click", "c1"),
			registries,
		);
		expect(next.selectedConnectorId).toBe("c1");
		expect(next.selectedVertex).toBeNull();
		expect(next.objectMenuOpenId).toBeNull();
		expect(next.stencilLibraryOpenCategory).toBeNull();
	});

	it("a double click selecting a connector also clears them", () => {
		const next = ConnectorEventHandler.handle(
			staleUiState(),
			makeEvent("doubleClick", "c1"),
			registries,
		);
		expect(next.selectedConnectorId).toBe("c1");
		expect(next.selectedVertex).toBeNull();
		expect(next.objectMenuOpenId).toBeNull();
		expect(next.stencilLibraryOpenCategory).toBeNull();
	});
});
