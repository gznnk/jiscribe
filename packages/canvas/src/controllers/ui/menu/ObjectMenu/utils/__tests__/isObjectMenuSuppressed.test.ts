import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { isObjectMenuSuppressed } from "../isObjectMenuSuppressed";

/** A state with one object selected and nothing withholding the menu. */
const makeState = (
	overrides: Partial<CanvasControllerState> = {},
): CanvasControllerState =>
	({
		selectedIds: ["rect-1"],
		selectedConnectorId: null,
		contextMenuPosition: null,
		textEditState: null,
		areaSelection: null,
		propertyPanel: { isOpen: false, collapsedSectionIds: [] },
		...overrides,
	}) as unknown as CanvasControllerState;

describe("isObjectMenuSuppressed", () => {
	it("lets the menu through for a plain single selection", () => {
		expect(isObjectMenuSuppressed(makeState())).toBe(false);
	});

	it("lets the menu through for a selected connector alone", () => {
		expect(
			isObjectMenuSuppressed(
				makeState({ selectedIds: [], selectedConnectorId: "conn-1" }),
			),
		).toBe(false);
	});

	it("withholds it while nothing is selected", () => {
		expect(
			isObjectMenuSuppressed(
				makeState({ selectedIds: [], selectedConnectorId: null }),
			),
		).toBe(true);
	});

	it("withholds it while the context menu is open", () => {
		expect(
			isObjectMenuSuppressed(
				makeState({ contextMenuPosition: { clientX: 10, clientY: 20 } }),
			),
		).toBe(true);
	});

	it("withholds it during a non-shape text edit, and keeps it during a shape's", () => {
		expect(
			isObjectMenuSuppressed(
				makeState({
					textEditState: {
						kind: "connectorLabel",
						objectId: "conn-1",
					} as unknown as CanvasControllerState["textEditState"],
				}),
			),
		).toBe(true);
		expect(
			isObjectMenuSuppressed(
				makeState({
					textEditState: {
						kind: "shape",
						objectId: "rect-1",
					} as unknown as CanvasControllerState["textEditState"],
				}),
			),
		).toBe(false);
	});

	it("withholds it while a marquee is being dragged", () => {
		expect(
			isObjectMenuSuppressed(
				makeState({
					areaSelection: {
						start: { x: 0, y: 0 },
						end: { x: 10, y: 10 },
					} as unknown as CanvasControllerState["areaSelection"],
				}),
			),
		).toBe(true);
	});

	it("withholds it while the properties sidebar is open", () => {
		expect(
			isObjectMenuSuppressed(
				makeState({
					propertyPanel: { isOpen: true, collapsedSectionIds: [] },
				}),
			),
		).toBe(true);
	});
});
