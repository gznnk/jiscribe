import { describe, expect, it } from "vitest";

import type {
	StencilLibraryPanelState,
	StencilPanelContent,
} from "../../CanvasTypes";
import {
	readDrawnStencilPanelContent,
	resolveDrawnStencilPanelContent,
} from "../stencilPanelContent";

const LIBRARY = ["basic", "flowchart"];
const CLOSED_DOCK: StencilLibraryPanelState = {
	isOpen: false,
	content: { kind: "catalog" },
};

describe("resolveDrawnStencilPanelContent", () => {
	it("draws a category the library holds as itself, the same reference", () => {
		const content: StencilPanelContent = {
			kind: "category",
			categoryId: "basic",
		};
		expect(resolveDrawnStencilPanelContent(content, LIBRARY)).toBe(content);
	});

	it("draws the catalog for a category the library does not hold", () => {
		expect(
			resolveDrawnStencilPanelContent(
				{ kind: "category", categoryId: "no-such-category" },
				LIBRARY,
			),
		).toEqual({ kind: "catalog" });
	});

	it("draws the catalog as itself", () => {
		const content: StencilPanelContent = { kind: "catalog" };
		expect(resolveDrawnStencilPanelContent(content, LIBRARY)).toBe(content);
	});
});

describe("readDrawnStencilPanelContent", () => {
	it("reads the flyout's content, drawn", () => {
		expect(
			readDrawnStencilPanelContent({
				stencilFlyout: { kind: "category", categoryId: "gone" },
				stencilLibraryPanel: CLOSED_DOCK,
				stencilLibraryCategoryIds: LIBRARY,
			}),
		).toEqual({ kind: "catalog" });
	});

	it("reads the docked panel's content only while it is docked", () => {
		const content: StencilPanelContent = {
			kind: "category",
			categoryId: "flowchart",
		};
		expect(
			readDrawnStencilPanelContent({
				stencilFlyout: null,
				stencilLibraryPanel: { isOpen: true, content },
				stencilLibraryCategoryIds: LIBRARY,
			}),
		).toBe(content);
		expect(
			readDrawnStencilPanelContent({
				stencilFlyout: null,
				stencilLibraryPanel: { isOpen: false, content },
				stencilLibraryCategoryIds: LIBRARY,
			}),
		).toBeNull();
	});
});
