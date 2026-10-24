import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type {
	CanvasControllerState,
	CanvasMode,
	DragStartSnapshot,
} from "../../../../CanvasTypes";
import { textSlotPartSelection } from "../../../../selection/__tests__/support/textSlotPartSelection";
import type { CanvasSelection } from "../../../../selection/CanvasSelection";
import { commitTextEditIntoDragSnapshot } from "../commitTextEditIntoDragSnapshot";

const textRect = (id: string, text: string): ObjectState =>
	({ id, type: "rect", text: { body: { text } } }) as unknown as ObjectState;

const labeledConnector = (
	id: string,
	label: Record<string, unknown>,
): ObjectState =>
	({
		id,
		type: "connector",
		source: { x: 0, y: 0 },
		target: { x: 100, y: 0 },
		points: [],
		label,
	}) as unknown as ObjectState;

/**
 * A state as handleGesture hands it to a dragStart handler: the drag open, its
 * snapshot frozen over the same objects.
 */
const openedDrag = (
	objects: Record<string, ObjectState>,
	session: { mode: CanvasMode; selection: CanvasSelection },
): CanvasControllerState =>
	({
		...session,
		objects,
		commitVersion: 3,
		drag: {
			kind: "inert",
			snapFeedback: null,
			axisLockFeedback: null,
			edgeScrollEnabled: false,
			startSnapshot: {
				objects,
				keyPoints: {},
				bboxes: {},
				snapCandidates: { x: [], y: [] },
				selectedIds: session.selection.objectIds,
				selectedIdsWithDescendants: new Set(session.selection.objectIds),
				multiSelectGroup: null,
				viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
			} as unknown as DragStartSnapshot,
		},
	}) as unknown as CanvasControllerState;

const editingBody = (objectId: string, text: string) => ({
	mode: { kind: "textEdit", draft: { kind: "shape", text } } as CanvasMode,
	selection: {
		objectIds: [objectId],
		part: textSlotPartSelection("body"),
	} as CanvasSelection,
});

const editingLabel = (connectorId: string, text: string) => ({
	mode: {
		kind: "textEdit",
		draft: { kind: "connectorLabel", text },
	} as CanvasMode,
	selection: { objectIds: [connectorId], part: null } as CanvasSelection,
});

const bodyTextOf = (object: ObjectState | undefined): string =>
	(object as unknown as { text: { body: { text: string } } }).text.body.text;

describe("commitTextEditIntoDragSnapshot", () => {
	it("commits a shape edit into both the objects and the drag's start snapshot", () => {
		const state = openedDrag(
			{
				"rect-1": textRect("rect-1", "old"),
				"rect-2": textRect("rect-2", "x"),
			},
			editingBody("rect-1", "new"),
		);

		const next = commitTextEditIntoDragSnapshot(state);

		expect(next.mode.kind).toBe("normal");
		expect(next.commitVersion).toBe(4);
		expect(bodyTextOf(next.objects["rect-1"])).toBe("new");
		const snapshot = next.drag?.startSnapshot;
		expect(snapshot?.objects["rect-1"]).toBe(next.objects["rect-1"]);
		// The rest of the snapshot is the frozen one, untouched
		const startSnapshot = state.drag?.startSnapshot;
		expect(snapshot?.objects["rect-2"]).toBe(startSnapshot?.objects["rect-2"]);
		expect(snapshot?.keyPoints).toBe(startSnapshot?.keyPoints);
		expect(snapshot?.bboxes).toBe(startSnapshot?.bboxes);
		expect(snapshot?.snapCandidates).toBe(startSnapshot?.snapCandidates);
		expect(next.drag?.kind).toBe("inert");
	});

	it("commits a connector label edit into the snapshot", () => {
		const state = openedDrag(
			{ "conn-1": labeledConnector("conn-1", { text: "old" }) },
			editingLabel("conn-1", "new"),
		);

		const next = commitTextEditIntoDragSnapshot(state);

		expect(next.drag?.startSnapshot.objects["conn-1"]).toMatchObject({
			label: { text: "new" },
		});
	});

	it("drops a label cleared to nothing from the snapshot too", () => {
		const state = openedDrag(
			{ "conn-1": labeledConnector("conn-1", { text: "old" }) },
			editingLabel("conn-1", ""),
		);

		const next = commitTextEditIntoDragSnapshot(state);

		expect(next.drag?.startSnapshot.objects["conn-1"]).not.toHaveProperty(
			"label",
		);
	});

	it("returns the state itself when no edit is open", () => {
		const state = openedDrag(
			{ "rect-1": textRect("rect-1", "old") },
			{
				mode: { kind: "normal" },
				selection: { objectIds: ["rect-1"], part: null },
			},
		);
		expect(commitTextEditIntoDragSnapshot(state)).toBe(state);
	});

	it("closes an unchanged edit without touching the drag", () => {
		const state = openedDrag(
			{ "rect-1": textRect("rect-1", "same") },
			editingBody("rect-1", "same"),
		);

		const next = commitTextEditIntoDragSnapshot(state);

		expect(next.mode.kind).toBe("normal");
		expect(next.drag).toBe(state.drag);
	});

	it("is a plain commit with no drag open", () => {
		const state = {
			...openedDrag(
				{ "rect-1": textRect("rect-1", "old") },
				editingBody("rect-1", "new"),
			),
			drag: null,
		};

		const next = commitTextEditIntoDragSnapshot(state);

		expect(bodyTextOf(next.objects["rect-1"])).toBe("new");
		expect(next.drag).toBeNull();
	});
});
