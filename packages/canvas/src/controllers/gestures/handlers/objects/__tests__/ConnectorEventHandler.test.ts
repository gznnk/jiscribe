import { describe, expect, it } from "vitest";

import type { ConnectorState } from "../../../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { ConnectorEventHandler } from "../ConnectorEventHandler";

const makeConnector = (id: string, labelText: string): ConnectorState =>
	({
		id,
		type: "connector",
		source: { objectId: "a" },
		target: { objectId: "b" },
		label: { text: labelText },
	}) as unknown as ConnectorState;

/** State while editing `editingId`'s label, with a pending (uncommitted) `pendingText`. */
const makeEditState = (
	editingId: string,
	labelText: string,
	pendingText: string,
): CanvasControllerState =>
	({
		objects: {
			[editingId]: makeConnector(editingId, labelText),
			c2: makeConnector("c2", "other"),
		},
		rootIds: [editingId, "c2"],
		selectedIds: [],
		selectedConnectorId: editingId,
		selectedVertex: null,
		multiSelectGroup: null,
		textEditState: { objectId: editingId, text: pendingText },
		commitVersion: 5,
		contextMenuPosition: { x: 1, y: 1 },
		viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
	}) as unknown as CanvasControllerState;

const makeEvent = (
	type: "pressed" | "click" | "doubleClick",
	targetId: string,
): CanvasEvent =>
	({
		type,
		targetKind: "connector",
		targetId,
		button: 0,
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

const labelText = (state: CanvasControllerState, id: string) =>
	(state.objects[id] as ConnectorState).label?.text;

describe("ConnectorEventHandler - label edit commit skipping", () => {
	it("a pressed on the connector being edited does not commit (continues editing)", () => {
		const next = ConnectorEventHandler.handle(
			makeEditState("c1", "old", "new"),
			makeEvent("pressed", "c1"),
		);
		// textEditState is preserved (uncommitted) and the label is untouched.
		expect(next.textEditState).toEqual({ objectId: "c1", text: "new" });
		expect(labelText(next, "c1")).toBe("old");
		expect(next.commitVersion).toBe(5);
	});

	it("re-double-clicking the same connector (pressed -> doubleClick) does not add an extra commit", () => {
		const afterPressed = ConnectorEventHandler.handle(
			makeEditState("c1", "old", "new"),
			makeEvent("pressed", "c1"),
		);
		const afterDouble = ConnectorEventHandler.handle(
			afterPressed,
			makeEvent("doubleClick", "c1"),
		);
		// Editing continues (re-edit guard reachable), no commit happened along the way.
		expect(afterDouble.textEditState?.objectId).toBe("c1");
		expect(labelText(afterDouble, "c1")).toBe("old");
		expect(afterDouble.commitVersion).toBe(5);
	});

	it("a pressed on a different connector commits the pending edit", () => {
		const next = ConnectorEventHandler.handle(
			makeEditState("c1", "old", "new"),
			makeEvent("pressed", "c2"),
		);
		// The edit is committed to c1 and the session is cleared.
		expect(labelText(next, "c1")).toBe("new");
		expect(next.textEditState).toBeNull();
		expect(next.commitVersion).toBe(6);
	});
});
