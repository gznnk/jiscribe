import { describe, expect, it } from "vitest";

import type { ConnectorState } from "../../../../../states/objects/connector/ConnectorState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { createTestRegistries } from "../../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../../selection/__tests__/support/selectionOf";
import { readTextEditDraft } from "../../../../utils/readTextEditDraft";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { ConnectorEventHandler } from "../ConnectorEventHandler";

const registries = createTestRegistries();

const connector = {
	id: "c1",
	type: "connector",
	points: [],
	source: { anchor: { kind: "free", point: { x: 0, y: 0 } } },
	target: { anchor: { kind: "free", point: { x: 200, y: 0 } } },
	routing: "straight",
	label: { text: "Yes" },
} as unknown as ConnectorState;

/** c1's label mid-edit, under the drag handleGesture opens over it. */
const editingUnderOpenedDrag = (): CanvasControllerState => {
	const objects = { c1: connector };
	return {
		objects,
		rootIds: ["c1"],
		selection: selectionOf(["c1"]),
		multiSelectGroup: null,
		mode: {
			kind: "textEdit",
			draft: { kind: "connectorLabel", text: "No" },
		},
		commitVersion: 0,
		drag: {
			kind: "inert",
			snapFeedback: null,
			axisLockFeedback: null,
			edgeScrollEnabled: false,
			startSnapshot: { objects },
		},
	} as unknown as CanvasControllerState;
};

/** A touch drag on the bare line: no targetAction, so no sub-handler claims it. */
const touchDragStartOnLine = {
	type: "dragStart",
	targetKind: "connector",
	targetId: "c1",
	button: 0,
	pointerType: "touch",
	start: { x: 100, y: 0 },
	last: { x: 120, y: 0 },
	delta: { x: 20, y: 0 },
	mods: { shift: false, alt: false, ctrl: false, meta: false },
} as unknown as CanvasEvent;

describe("ConnectorEventHandler", () => {
	it("commits an open edit on a touch drag on the bare line, which no sub-handler claims", () => {
		const next = ConnectorEventHandler.handle(
			editingUnderOpenedDrag(),
			touchDragStartOnLine,
			registries,
		);

		expect(readTextEditDraft(next)).toBeNull();
		expect(next.objects["c1"]).toMatchObject({ label: { text: "No" } });
		expect(next.drag?.startSnapshot.objects["c1"]).toBe(next.objects["c1"]);
		expect(next.drag?.kind).toBe("inert");
	});

	it("still defers the commit on a touch press, which may become a pinch", () => {
		const state = editingUnderOpenedDrag();
		const next = ConnectorEventHandler.handle(
			state,
			{ ...touchDragStartOnLine, type: "pressed" } as CanvasEvent,
			registries,
		);

		expect(readTextEditDraft(next)).toEqual(readTextEditDraft(state));
	});
});
