import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { ConnectorFeatures } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import { isOrthogonalRouting } from "@jiscribe/doc/model/objects/types/ConnectorRouting";
import type { Point } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../../../states/objects/connector/ConnectorState";
import { deepFreezeState } from "../../../../../__tests__/support/deepFreezeState";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { createInitialControllerState } from "../../../../../reducer/createInitialControllerState";
import { createTestRegistries } from "../../../../../registries/createCanvasRegistries";
import type { CanvasEvent } from "../../../../registry/GestureHandlerTypes";
import { ConnectionAnchorEventHandler } from "../ConnectionAnchorEventHandler";

const registries = createTestRegistries();

/**
 * An empty document with no shapes.
 * The source only carries an owner reference and needs no actual shape (editing tests move only the target's free endpoint).
 */
const emptyDoc: CanvasDoc = {
	version: 1,
	root: [],
} as unknown as CanvasDoc;

/**
 * Build a one-free connector with an owned source (connected to a host shape) + a free target.
 * The source is owned so the connector invariant "at least one endpoint owned" holds.
 * Endpoint-editing tests target the target (the free endpoint).
 */
const oneFreeConnector = (id: string, target: Point): ConnectorState =>
	({
		id,
		type: "connector",
		points: [],
		source: { owner: { id: "host" }, anchor: { kind: "center" } },
		target: { anchor: { kind: "free", point: target } },
		stroke: "auto",
		strokeWidth: 2,
		endArrow: "ConcaveTriangle",
	}) as unknown as ConnectorState;

/**
 * A connector with an owned edge-midpoint (connectPoint) source + free target.
 * Used by re-anchor tests: the source keeps its direction, so routing is decided by
 * where the target lands (center → straight, edge → orthogonal). `routing` is optional
 * so a test can pin an explicit value and check it survives a re-anchor.
 */
const edgeSourceConnector = (
	id: string,
	target: Point,
	routing?: "straight" | "orthogonal",
): ConnectorState =>
	({
		id,
		type: "connector",
		points: [],
		source: {
			owner: { id: "host" },
			anchor: { kind: "connectPoint", id: "rightCenter" },
		},
		target: { anchor: { kind: "free", point: target } },
		...(routing ? { routing } : {}),
		stroke: "auto",
		strokeWidth: 2,
		endArrow: "ConcaveTriangle",
	}) as unknown as ConnectorState;

/** A connectable object without frame geometry: calcNearestAnchor always resolves it to center. */
const blobObject = {
	id: "blob",
	type: "rect",
	features: { connectable: true },
} as unknown as ObjectState;

/** Add the center-resolving blob to a state's objects (top-level only; snapshot not needed for hover). */
const withBlob = (state: CanvasControllerState): CanvasControllerState => ({
	...state,
	objects: { ...state.objects, blob: blobObject },
});

/**
 * Build a state that injects connectors into objects / rootIds and also prepares the
 * eventStartSnapshot that serves as the editing baseline (in the real app, handleGesture creates it on dragStart).
 * Connectors are managed intermixed in rootIds, so push them onto rootIds.
 */
const stateWithConnectors = (
	connectors: ConnectorState[],
): CanvasControllerState => {
	const base = createInitialControllerState(emptyDoc, registries);
	const objects = { ...base.objects };
	for (const c of connectors) {
		objects[c.id] = c;
	}
	return deepFreezeState({
		...base,
		objects,
		rootIds: [...base.rootIds, ...connectors.map((c) => c.id)],
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

/** Build a drag-type CanvasEvent. `hoveredIds` lets a drop resolve onto a shape. */
const dragEvent = (
	type: "dragStart" | "dragEnd",
	targetId: string,
	targetPart: string,
	last: Point,
	hoveredIds: string[] = [],
): CanvasEvent =>
	({
		type,
		target: null,
		targetId,
		targetPart,
		targetKind: "control",
		start: { x: 0, y: 0 },
		last,
		delta: { x: 0, y: 0 },
		clientStart: { x: 0, y: 0 },
		clientLast: { x: 0, y: 0 },
		clientDelta: { x: 0, y: 0 },
		mods: { shift: false, ctrl: false, alt: false, meta: false },
		getHovered: () => hoveredIds.map((id) => ({ id })),
		time: 0,
		button: 0,
	}) as unknown as CanvasEvent;

describe("ConnectionAnchorEventHandler endpoint editing (direct entity editing)", () => {
	const handler = new ConnectionAnchorEventHandler();

	it("does not change the connector's stacking order (rootIds) when editing", () => {
		const state = stateWithConnectors([
			oneFreeConnector("c1", { x: 10, y: 10 }),
			oneFreeConnector("c2", { x: 20, y: 20 }),
			oneFreeConnector("c3", { x: 30, y: 30 }),
		]);

		const afterStart = handler.handle(
			state,
			dragEvent("dragStart", "c1", "endpoint:target", {
				x: 10,
				y: 10,
			}),
			registries,
		);
		const afterEnd = handler.handle(
			afterStart,
			dragEvent("dragEnd", "c1", "endpoint:target", {
				x: 50,
				y: 50,
			}),
			registries,
		);

		expect(afterEnd.rootIds).toEqual(["c1", "c2", "c3"]);
	});

	it("updates the entity directly during editing without using an overlay (pendingConnector)", () => {
		const state = stateWithConnectors([
			oneFreeConnector("c1", { x: 10, y: 10 }),
		]);

		const afterStart = handler.handle(
			state,
			dragEvent("dragStart", "c1", "endpoint:target", {
				x: 10,
				y: 10,
			}),
			registries,
		);
		// On dragStart, no pendingConnector is created; only the edit target is recorded
		expect(afterStart.pendingConnector).toBeNull();
		expect(afterStart.editingConnectorId).toBe("c1");

		// On dragEnd, the entity's (objects["c1"]) target moves directly
		const afterEnd = handler.handle(
			afterStart,
			dragEvent("dragEnd", "c1", "endpoint:target", {
				x: 80,
				y: 80,
			}),
			registries,
		);
		const updated = afterEnd.objects["c1"] as ConnectorState;
		expect(updated.target.anchor).toEqual({
			kind: "free",
			point: { x: 80, y: 80 },
		});
		expect(afterEnd.pendingConnector).toBeNull();
		expect(afterEnd.editingConnectorId).toBeNull();
	});

	it("keeps the objects reference for a no-op edit that returns the endpoint to its original position (no commit)", () => {
		const state = stateWithConnectors([
			oneFreeConnector("c1", { x: 10, y: 10 }),
		]);

		const afterStart = handler.handle(
			state,
			dragEvent("dragStart", "c1", "endpoint:target", {
				x: 10,
				y: 10,
			}),
			registries,
		);
		// Confirm dragEnd at the original target position (10,10) -> the endpoint is unchanged
		const afterEnd = handler.handle(
			afterStart,
			dragEvent("dragEnd", "c1", "endpoint:target", {
				x: 10,
				y: 10,
			}),
			registries,
		);

		// The objects reference is unchanged = handleGesture's auto-commit check does not fire
		expect(afterEnd.objects).toBe(state.objects);
		expect(afterEnd.editingConnectorId).toBeNull();
	});

	it("changes the objects reference for an edit that moves the endpoint (subject to commit)", () => {
		const state = stateWithConnectors([
			oneFreeConnector("c1", { x: 10, y: 10 }),
		]);

		const afterStart = handler.handle(
			state,
			dragEvent("dragStart", "c1", "endpoint:target", {
				x: 10,
				y: 10,
			}),
			registries,
		);
		const afterEnd = handler.handle(
			afterStart,
			dragEvent("dragEnd", "c1", "endpoint:target", {
				x: 99,
				y: 99,
			}),
			registries,
		);

		expect(afterEnd.objects).not.toBe(state.objects);
		const updated = afterEnd.objects["c1"] as ConnectorState;
		expect(updated.target.anchor).toEqual({
			kind: "free",
			point: { x: 99, y: 99 },
		});
		expect(afterEnd.rootIds).toEqual(["c1"]);
	});

	it("inserts a newly created connector at the end of rootIds (frontmost)", () => {
		// Place one shape to serve as the source in rootIds (to verify front insertion).
		const base = stateWithConnectors([]);
		const state: CanvasControllerState = {
			...base,
			objects: {
				...base.objects,
				"rect-1": { id: "rect-1", type: "rect" } as unknown as ObjectState,
			},
			rootIds: ["rect-1"],
		};

		const afterStart = handler.handle(
			state,
			dragEvent("dragStart", "rect-1", "anchor:rightCenter", {
				x: 10,
				y: 10,
			}),
			registries,
		);
		const afterEnd = handler.handle(
			afterStart,
			dragEvent("dragEnd", "rect-1", "anchor:rightCenter", {
				x: 80,
				y: 80,
			}),
			registries,
		);

		// The new connector goes to the end of rootIds (frontmost) and is drawn above rect-1
		expect(afterEnd.rootIds.length).toBe(2);
		expect(afterEnd.rootIds[0]).toBe("rect-1");
		const newId = afterEnd.rootIds[1];
		expect(afterEnd.objects[newId]?.type).toBe("connector");
	});

	/**
	 * Drives the create gesture (drag from a shape's connection anchor) end to end and
	 * returns the committed connector plus the state it landed in.
	 */
	const createConnectorFromRect = (): {
		state: CanvasControllerState;
		connectorId: string;
	} => {
		const base = stateWithConnectors([]);
		const state: CanvasControllerState = {
			...base,
			objects: {
				...base.objects,
				"rect-1": { id: "rect-1", type: "rect" } as unknown as ObjectState,
			},
			rootIds: ["rect-1"],
		};

		const afterStart = handler.handle(
			state,
			dragEvent("dragStart", "rect-1", "anchor:rightCenter", { x: 10, y: 10 }),
			registries,
		);
		const afterEnd = handler.handle(
			afterStart,
			dragEvent("dragEnd", "rect-1", "anchor:rightCenter", { x: 80, y: 80 }),
			registries,
		);

		const connectorId = afterEnd.rootIds[afterEnd.rootIds.length - 1];
		return { state: afterEnd, connectorId };
	};

	// Regression guard for #167: a connector created via the gesture must carry the
	// features descriptor. The style-property handlers read state.features directly to gate
	// style updates, so a freshly created connector without it silently ignores every
	// stroke change until a save/reload re-stamps features through the registry.
	describe("a newly created connector is immediately style-editable (regression #167)", () => {
		it("stamps the shared ConnectorFeatures descriptor (same reference, for memo stability)", () => {
			const { state, connectorId } = createConnectorFromRect();
			const connector = state.objects[connectorId] as ConnectorState;
			expect(connector.features).toBe(ConnectorFeatures);
		});

		it("applies stroke-group updates dispatched by the style menu (dash / color / width)", () => {
			const { state, connectorId } = createConnectorFromRect();
			// The style menu targets the selected connector via selectedConnectorId.
			const selected: CanvasControllerState = {
				...state,
				selectedIds: [],
				selectedConnectorId: connectorId,
			};

			const dashed = registries.styleProperty.apply(
				selected,
				"strokeDashType",
				"dashed",
			);
			expect(
				(dashed.objects[connectorId] as ConnectorState).strokeDashType,
			).toBe("dashed");

			const colored = registries.styleProperty.apply(
				selected,
				"stroke",
				"#ff0000",
			);
			expect((colored.objects[connectorId] as ConnectorState).stroke).toBe(
				"#ff0000",
			);

			const widened = registries.styleProperty.apply(
				selected,
				"strokeWidth",
				"7",
			);
			expect((widened.objects[connectorId] as ConnectorState).strokeWidth).toBe(
				7,
			);
		});
	});

	it("omits routing on a new connector (follows the default orthogonal when omitted)", () => {
		const base = stateWithConnectors([]);
		const state: CanvasControllerState = {
			...base,
			objects: {
				...base.objects,
				"rect-1": { id: "rect-1", type: "rect" } as unknown as ObjectState,
			},
			rootIds: ["rect-1"],
		};

		const afterStart = handler.handle(
			state,
			dragEvent("dragStart", "rect-1", "anchor:rightCenter", {
				x: 10,
				y: 10,
			}),
			registries,
		);

		// No explicit field (omitted); the default interpretation makes it orthogonal.
		expect(afterStart.pendingConnector?.routing).toBeUndefined();
		expect(isOrthogonalRouting(afterStart.pendingConnector?.routing)).toBe(
			true,
		);
	});

	it("keeps orthogonal (routing omitted) when a new connector drops onto empty space (edge → free)", () => {
		const { state, connectorId } = createConnectorFromRect();
		const connector = state.objects[connectorId] as ConnectorState;
		expect(connector.target.anchor.kind).toBe("free");
		expect(connector.routing).toBeUndefined();
	});

	it("defaults to straight routing when a new connector lands on a center anchor", () => {
		// A connectable object without frame geometry always resolves to a center anchor
		// (calcNearestAnchor returns center for non-frame targets).
		const base = stateWithConnectors([]);
		const state: CanvasControllerState = {
			...base,
			objects: {
				...base.objects,
				"rect-1": { id: "rect-1", type: "rect" } as unknown as ObjectState,
				blob: {
					id: "blob",
					type: "rect",
					features: { connectable: true },
				} as unknown as ObjectState,
			},
			rootIds: ["rect-1", "blob"],
		};

		const afterStart = handler.handle(
			state,
			dragEvent("dragStart", "rect-1", "anchor:rightCenter", { x: 10, y: 10 }),
			registries,
		);
		const afterEnd = handler.handle(
			afterStart,
			dragEvent("dragEnd", "rect-1", "anchor:rightCenter", { x: 80, y: 80 }, [
				"blob",
			]),
			registries,
		);

		const connectorId = afterEnd.rootIds[afterEnd.rootIds.length - 1];
		const connector = afterEnd.objects[connectorId] as ConnectorState;
		expect(connector.target.anchor).toEqual({ kind: "center" });
		expect(connector.routing).toBe("straight");
	});

	// Re-anchor parity (①): editing an existing connector's endpoint follows the same
	// anchor-derived routing rule as creation, but only when routing was never set and the
	// edited anchor actually changed.
	describe("re-anchoring an existing connector derives routing from the new anchors", () => {
		it("flips an unset-routing connector to straight when its endpoint is re-anchored onto a center", () => {
			const state = withBlob(
				stateWithConnectors([edgeSourceConnector("c1", { x: 10, y: 10 })]),
			);

			const afterStart = handler.handle(
				state,
				dragEvent("dragStart", "c1", "endpoint:target", { x: 10, y: 10 }),
				registries,
			);
			const afterEnd = handler.handle(
				afterStart,
				dragEvent("dragEnd", "c1", "endpoint:target", { x: 80, y: 80 }, [
					"blob",
				]),
				registries,
			);

			const updated = afterEnd.objects["c1"] as ConnectorState;
			expect(updated.target.anchor).toEqual({ kind: "center" });
			expect(updated.routing).toBe("straight");
			// A real re-anchor commits (objects reference changed).
			expect(afterEnd.objects).not.toBe(state.objects);
		});

		it("leaves routing unset on a no-op grab (edited anchor unchanged)", () => {
			// source is center, so deriving would yield straight — the no-op guard must prevent it.
			const state = stateWithConnectors([
				oneFreeConnector("c1", { x: 10, y: 10 }),
			]);

			const afterStart = handler.handle(
				state,
				dragEvent("dragStart", "c1", "endpoint:target", { x: 10, y: 10 }),
				registries,
			);
			const afterEnd = handler.handle(
				afterStart,
				dragEvent("dragEnd", "c1", "endpoint:target", { x: 10, y: 10 }),
				registries,
			);

			expect(
				(afterEnd.objects["c1"] as ConnectorState).routing,
			).toBeUndefined();
			// No-op edit does not commit.
			expect(afterEnd.objects).toBe(state.objects);
		});

		it("preserves an explicit routing choice when re-anchored onto a center", () => {
			const state = withBlob(
				stateWithConnectors([
					edgeSourceConnector("c1", { x: 10, y: 10 }, "orthogonal"),
				]),
			);

			const afterStart = handler.handle(
				state,
				dragEvent("dragStart", "c1", "endpoint:target", { x: 10, y: 10 }),
				registries,
			);
			const afterEnd = handler.handle(
				afterStart,
				dragEvent("dragEnd", "c1", "endpoint:target", { x: 80, y: 80 }, [
					"blob",
				]),
				registries,
			);

			const updated = afterEnd.objects["c1"] as ConnectorState;
			expect(updated.target.anchor).toEqual({ kind: "center" });
			// Explicit orthogonal is kept even though the target is now a center anchor.
			expect(updated.routing).toBe("orthogonal");
		});
	});
});
