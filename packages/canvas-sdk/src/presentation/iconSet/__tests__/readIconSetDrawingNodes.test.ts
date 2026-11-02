import { describe, expect, it } from "vitest";

import type { IconSetDrawing } from "../../../schema/iconSet/IconSetTypes";
import { readIconSetDrawingNodes } from "../readIconSetDrawingNodes";

/** Dark ink for a white ground, with the vendor's own light-ink counterpart. */
const WITH_DARK: IconSetDrawing = {
	nodes: [["path", { d: "M0 0h1", fill: "#232F3D" }]],
	darkNodes: [["path", { d: "M0 0h1", fill: "#FFFFFF" }]],
};

/** Category colours, which read on either ground; one rendition only. */
const SINGLE: IconSetDrawing = {
	nodes: [["rect", { width: "1", height: "1", fill: "#ED7100" }]],
};

describe("readIconSetDrawingNodes", () => {
	it("takes the vendor's own dark drawing on a dark ground", () => {
		expect(readIconSetDrawingNodes(WITH_DARK, "dark")).toBe(
			WITH_DARK.darkNodes,
		);
		expect(readIconSetDrawingNodes(WITH_DARK, "light")).toBe(WITH_DARK.nodes);
	});

	it("keeps the one drawing on both grounds where there is no dark one", () => {
		expect(readIconSetDrawingNodes(SINGLE, "dark")).toBe(SINGLE.nodes);
		expect(readIconSetDrawingNodes(SINGLE, "light")).toBe(SINGLE.nodes);
	});
});
