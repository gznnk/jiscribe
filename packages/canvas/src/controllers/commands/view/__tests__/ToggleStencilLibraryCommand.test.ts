import { describe, expect, it } from "vitest";

import type {
	CanvasControllerState,
	StencilPanelContent,
} from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../selection/__tests__/support/selectionOf";
import { ToggleStencilLibraryCommand } from "../ToggleStencilLibraryCommand";

const registries = createTestRegistries();

const CATALOG: StencilPanelContent = { kind: "catalog" };
const FLOWCHART: StencilPanelContent = {
	kind: "category",
	categoryId: "flowchart",
};

/** Nothing open: no flyout, the docked panel closed on the catalog. */
const makeState = (
	overrides: Partial<CanvasControllerState> = {},
): CanvasControllerState =>
	({
		mode: { kind: "normal" },
		stencilFlyout: null,
		stencilLibraryPanel: { isOpen: false, content: CATALOG },
		pinnedCategoryIds: ["flowchart"],
		stencilLibraryCategoryIds: ["basic", "flowchart"],
		selection: selectionOf(["a"]),
		...overrides,
	}) as unknown as CanvasControllerState;

const execute = (state: CanvasControllerState) =>
	ToggleStencilLibraryCommand.execute(state, registries);

describe("ToggleStencilLibraryCommand", () => {
	it("opens the catalog over the canvas when nothing is open", () => {
		const next = execute(makeState());
		expect(next.stencilFlyout).toEqual(CATALOG);
		expect(next.stencilLibraryPanel.isOpen).toBe(false);
	});

	it("switches the flyout from a category to the catalog", () => {
		const next = execute(makeState({ stencilFlyout: FLOWCHART }));
		expect(next.stencilFlyout).toEqual(CATALOG);
	});

	it("closes the catalog open over the canvas", () => {
		const next = execute(makeState({ stencilFlyout: CATALOG }));
		expect(next.stencilFlyout).toBeNull();
	});

	it("closes the catalog while it is docked", () => {
		const next = execute(
			makeState({ stencilLibraryPanel: { isOpen: true, content: CATALOG } }),
		);
		expect(next.stencilLibraryPanel.isOpen).toBe(false);
		expect(next.stencilFlyout).toBeNull();
	});

	it("shows the catalog in the docked panel while that shows a category", () => {
		const next = execute(
			makeState({ stencilLibraryPanel: { isOpen: true, content: FLOWCHART } }),
		);
		expect(next.stencilLibraryPanel).toEqual({
			isOpen: true,
			content: CATALOG,
		});
		// Never beside the docked panel.
		expect(next.stencilFlyout).toBeNull();
	});

	/**
	 * The docked panel draws a category the library lacks as the catalog, and
	 * the catalog button shows pressed: that press has to close it, not swap in
	 * the catalog it already draws.
	 */
	it("closes a docked panel that draws the catalog for a category the library lacks", () => {
		const next = execute(
			makeState({
				stencilLibraryPanel: {
					isOpen: true,
					content: { kind: "category", categoryId: "no-such-category" },
				},
			}),
		);
		expect(next.stencilLibraryPanel.isOpen).toBe(false);
		expect(next.stencilFlyout).toBeNull();
	});

	it("leaves the pins and the selection alone", () => {
		const next = execute(makeState());
		expect(next.pinnedCategoryIds).toEqual(["flowchart"]);
		expect(next.selection.objectIds).toEqual(["a"]);
	});

	it("carries no keyboard shortcut", () => {
		expect(ToggleStencilLibraryCommand.shortcuts).toBeUndefined();
	});
});
