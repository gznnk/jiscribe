import { describe, expect, it } from "vitest";

import type { ConnectorState } from "../../../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { createTestRegistries } from "../../../../registries/createCanvasRegistries";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { ConnectorEventHandler } from "../ConnectorEventHandler";

const registries = createTestRegistries();

const makeConnector = (id: string, labelText: string): ConnectorState =>
	({
		id,
		type: "connector",
		source: { objectId: "a" },
		target: { objectId: "b" },
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
		textEditState: { objectId: editingId, text: pendingText },
	}) as unknown as CanvasControllerState;

const makeEvent = (
	type: "pressed" | "click" | "doubleClick",
	targetId: string,
	targetPart?: string,
): CanvasEvent =>
	({
		type,
		targetKind: "connector",
		targetId,
		targetPart,
		button: 0,
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

const labelText = (state: CanvasControllerState, id: string) =>
	(state.objects[id] as ConnectorState).label?.text;

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
		expect(next.textEditState).toEqual({ objectId: "c1", text: "Yes" });
		expect(next.selectedConnectorId).toBe("c1");
	});

	it("without a label, a double click anywhere on the line opens the editor empty", () => {
		const next = ConnectorEventHandler.handle(
			makeState(""),
			makeEvent("doubleClick", "c1"),
			registries,
		);
		expect(next.textEditState).toEqual({ objectId: "c1", text: "" });
		expect(next.selectedConnectorId).toBe("c1");
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

describe("ConnectorEventHandler - closes menus on selection change", () => {
	const openMenusState = (): CanvasControllerState =>
		({
			...makeState("Yes"),
			objectMenuOpenId: "style",
			stencilLibraryOpenCategory: "flowchart",
		}) as unknown as CanvasControllerState;

	it("a click selecting a connector closes the ObjectMenu submenu and the category flyout", () => {
		const next = ConnectorEventHandler.handle(
			openMenusState(),
			makeEvent("click", "c1"),
			registries,
		);
		expect(next.selectedConnectorId).toBe("c1");
		expect(next.objectMenuOpenId).toBeNull();
		expect(next.stencilLibraryOpenCategory).toBeNull();
	});

	it("a double click selecting a connector also closes them", () => {
		const next = ConnectorEventHandler.handle(
			openMenusState(),
			makeEvent("doubleClick", "c1"),
			registries,
		);
		expect(next.selectedConnectorId).toBe("c1");
		expect(next.objectMenuOpenId).toBeNull();
		expect(next.stencilLibraryOpenCategory).toBeNull();
	});
});
