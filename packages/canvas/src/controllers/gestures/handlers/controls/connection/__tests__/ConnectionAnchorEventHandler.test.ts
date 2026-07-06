import type { Point } from "@workspace/geometry";
import { beforeAll, describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../../../../../schemas/canvas/CanvasDoc";
import { isOrthogonalRouting } from "../../../../../../schemas/objects/types/ConnectorRouting";
import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../../../states/objects/connections/connector/ConnectorState";
import { deepFreezeState } from "../../../../../__tests__/support/deepFreezeState";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { createInitialControllerState } from "../../../../../reducer/createInitialControllerState";
import { initializeObjectRegistry } from "../../../../../setup/initializeObjectRegistry";
import type { CanvasEvent } from "../../../../registry/GestureHandlerTypes";
import { ConnectionAnchorEventHandler } from "../ConnectionAnchorEventHandler";

beforeAll(() => {
	initializeObjectRegistry();
});

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
 * Build a state that injects connectors into objects / rootIds and also prepares the
 * eventStartSnapshot that serves as the editing baseline (in the real app, handleGesture creates it on dragStart).
 * Connectors are managed intermixed in rootIds, so push them onto rootIds.
 */
const stateWithConnectors = (
	connectors: ConnectorState[],
): CanvasControllerState => {
	const base = createInitialControllerState(emptyDoc);
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

/** Build a drag-type CanvasEvent. */
const dragEvent = (
	type: "dragStart" | "dragEnd",
	targetId: string,
	targetPart: string,
	last: Point,
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
		hovered: [],
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
		);
		const afterEnd = handler.handle(
			afterStart,
			dragEvent("dragEnd", "c1", "endpoint:target", {
				x: 50,
				y: 50,
			}),
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
		);
		// Confirm dragEnd at the original target position (10,10) -> the endpoint is unchanged
		const afterEnd = handler.handle(
			afterStart,
			dragEvent("dragEnd", "c1", "endpoint:target", {
				x: 10,
				y: 10,
			}),
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
		);
		const afterEnd = handler.handle(
			afterStart,
			dragEvent("dragEnd", "c1", "endpoint:target", {
				x: 99,
				y: 99,
			}),
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
		);
		const afterEnd = handler.handle(
			afterStart,
			dragEvent("dragEnd", "rect-1", "anchor:rightCenter", {
				x: 80,
				y: 80,
			}),
		);

		// The new connector goes to the end of rootIds (frontmost) and is drawn above rect-1
		expect(afterEnd.rootIds.length).toBe(2);
		expect(afterEnd.rootIds[0]).toBe("rect-1");
		const newId = afterEnd.rootIds[1];
		expect(afterEnd.objects[newId]?.type).toBe("connector");
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
		);

		// No explicit field (omitted); the default interpretation makes it orthogonal.
		expect(afterStart.pendingConnector?.routing).toBeUndefined();
		expect(isOrthogonalRouting(afterStart.pendingConnector?.routing)).toBe(
			true,
		);
	});
});
