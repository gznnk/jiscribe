import { describe, expect, it } from "vitest";

import { createIconSetCatalog } from "../../../schema/iconSet/createIconSetCatalog";
import type { IconSetDrawing } from "../../../schema/iconSet/IconSetTypes";
import { readIconSetArt } from "../readIconSetArt";

const catalog = createIconSetCatalog({
	setLabel: "Test",
	entries: {
		drawn: { label: "Drawn", category: "A", viewBox: "0 0 18 18" },
		undrawn: { label: "Undrawn", category: "A", viewBox: "0 0 18 18" },
	},
	aliases: { d: "drawn" },
	palette: [],
	browseGroups: [{ id: "a", label: "A", categories: ["A"] }],
	listShorthands: () => [],
});

const DRAWN: IconSetDrawing = { nodes: [["rect", { width: "1" }]] };
const drawings = { drawn: DRAWN };

describe("readIconSetArt", () => {
	it("answers with the entry and the drawing a resolvable name points at", () => {
		expect(readIconSetArt(catalog, drawings, "d")).toEqual({
			entry: catalog.readEntry("drawn"),
			drawing: DRAWN,
		});
	});

	// The stand-in a set shows once its drawings stop shipping: the catalog
	// still knows the name, so documents keep opening.
	it("answers null for a name the catalog knows but the drawings do not", () => {
		expect(catalog.isKnownName("undrawn")).toBe(true);
		expect(readIconSetArt(catalog, drawings, "undrawn")).toBeNull();
	});

	it("answers null for a name that resolves to nothing", () => {
		expect(readIconSetArt(catalog, drawings, "missing")).toBeNull();
		expect(readIconSetArt(catalog, drawings, "constructor")).toBeNull();
	});
});
