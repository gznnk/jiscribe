import { describe, expect, it } from "vitest";

import type { StencilPanelContent } from "../../../../../CanvasTypes";
import { createCanvasRegistries } from "../../../../../registries/createCanvasRegistries";
import { basicStencilCategory } from "../../../../objects/StencilCategory";
import { resolveDrawnStencilPanelContent } from "../resolveDrawnStencilPanelContent";
import { resolveStencilCategories } from "../resolveStencilCategory";

const librarySections = resolveStencilCategories(
	[basicStencilCategory],
	createCanvasRegistries().stencil,
);

describe("resolveDrawnStencilPanelContent", () => {
	it("draws a category the library holds as itself, the same reference", () => {
		const content: StencilPanelContent = {
			kind: "category",
			categoryId: "basic",
		};
		expect(resolveDrawnStencilPanelContent(content, librarySections)).toBe(
			content,
		);
	});

	it("draws the catalog for a category the library does not hold", () => {
		expect(
			resolveDrawnStencilPanelContent(
				{ kind: "category", categoryId: "no-such-category" },
				librarySections,
			),
		).toEqual({ kind: "catalog" });
	});

	it("draws the catalog as itself", () => {
		const content: StencilPanelContent = { kind: "catalog" };
		expect(resolveDrawnStencilPanelContent(content, librarySections)).toBe(
			content,
		);
	});
});
