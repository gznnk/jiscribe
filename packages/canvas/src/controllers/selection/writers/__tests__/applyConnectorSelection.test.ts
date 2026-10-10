import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { selectionOf } from "../../__tests__/support/selectionOf";
import { applyConnectorSelection } from "../applyConnectorSelection";

const objects: Record<string, ObjectState> = {
	"rect-1": { id: "rect-1", type: "rect" } as unknown as ObjectState,
	"conn-1": { id: "conn-1", type: "connector" } as unknown as ObjectState,
};

const makeState = (selectedIds: string[]): CanvasControllerState =>
	({
		objects,
		selection: selectionOf(selectedIds),
		multiSelectGroup: { id: "ms" },
		objectMenuOpenId: "stroke-color",
		stencilLibraryOpenCategory: "basic",
	}) as unknown as CanvasControllerState;

describe("applyConnectorSelection", () => {
	it("makes the connector the whole selection", () => {
		const next = applyConnectorSelection(
			makeState(["rect-1", "rect-2"]),
			"conn-1",
		);

		expect(next.selection.objectIds).toEqual(["conn-1"]);
		expect(next.multiSelectGroup).toBeNull();
		expect(next.objectMenuOpenId).toBeNull();
		expect(next.stencilLibraryOpenCategory).toBeNull();
	});

	it("returns the state itself when the connector is already the selection", () => {
		const state = makeState(["conn-1"]);
		expect(applyConnectorSelection(state, "conn-1")).toBe(state);
	});

	it("replaces another selected connector", () => {
		const next = applyConnectorSelection(makeState(["conn-1"]), "conn-2");
		expect(next.selection.objectIds).toEqual(["conn-2"]);
	});
});
