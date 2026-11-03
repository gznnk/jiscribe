import type { IconSetDrawing, IconSetNode } from "@jiscribe/canvas-sdk/doc";
import { describe, expect, it } from "vitest";

import { GCP_ICON_CATALOG_ENTRIES } from "../../schema/icon/iconCatalog.generated";
import { GCP_ICON_DRAWINGS } from "../iconDrawings.generated";

/** Flattens the node tree so the attributes can be looked at one by one. */
const walkNodes = function* (
	nodes: readonly IconSetNode[],
): Generator<IconSetNode> {
	for (const node of nodes) {
		yield node;
		yield* walkNodes(node[2] ?? []);
	}
};

const listDrawingNodes = (drawing: IconSetDrawing): IconSetNode[] => [
	...walkNodes(drawing.nodes),
];

/** The ids an attribute value refers to: `url(#…)` anywhere, and `href="#…"`. */
const readReferences = (name: string, value: string): string[] =>
	name === "href" && value.startsWith("#")
		? [value.slice(1)]
		: [...value.matchAll(/url\(#([^)]+)\)/g)].map(([, id]) => id);

const allNodes = Object.values(GCP_ICON_DRAWINGS).flatMap(listDrawingNodes);

describe("GCP_ICON_DRAWINGS", () => {
	it("draws exactly the icons the catalog names", () => {
		expect(Object.keys(GCP_ICON_DRAWINGS).sort()).toEqual(
			Object.keys(GCP_ICON_CATALOG_ENTRIES).sort(),
		);
	});

	it("gives every icon at least one node and no dark rendition", () => {
		const odd = Object.entries(GCP_ICON_DRAWINGS).filter(
			([, drawing]) =>
				drawing.nodes.length === 0 || drawing.darkNodes !== undefined,
		);
		expect(odd).toEqual([]);
	});

	// Google's assets fill with flat colours and refer to no id, so the
	// converter keeps none and no drawing needs IconSetArt's per-instance
	// suffixing. An id kept here would have to be listed in idRefs.
	it("keeps no id and refers to none", () => {
		const withIds = allNodes.filter(
			([, attrs]) =>
				attrs.id !== undefined ||
				Object.entries(attrs).some(
					([name, value]) => readReferences(name, value).length > 0,
				),
		);
		expect(withIds).toEqual([]);
		expect(
			Object.values(GCP_ICON_DRAWINGS).filter(
				(drawing) => drawing.idRefs !== undefined,
			),
		).toEqual([]);
	});

	// What the generator adjusts must leave nothing behind that it drops.
	it("carries no class, style, isolation, xlink or data-name", () => {
		const leftovers = allNodes.filter(([, attrs]) =>
			Object.keys(attrs).some((name) =>
				[
					"className",
					"class",
					"style",
					"isolation",
					"xlinkHref",
					"dataName",
				].includes(name),
			),
		);
		expect(leftovers).toEqual([]);
	});

	// The stylesheet's classes are expanded into attributes: every drawing
	// still paints in Google's colours.
	it("paints every drawing with the fills its stylesheet gave it", () => {
		const unpainted = Object.entries(GCP_ICON_DRAWINGS).filter(
			([, drawing]) =>
				!listDrawingNodes(drawing).some(
					([, attrs]) => attrs.fill !== undefined && attrs.fill !== "none",
				),
		);
		expect(unpainted).toEqual([]);
	});

	// The drawings are redistributed unmodified (LICENSE-ICONS.md): nothing
	// rounds their coordinates.
	it("keeps the path data at the precision Google authored it in", () => {
		const precise = allNodes.flatMap(([, attrs]) =>
			Object.values(attrs).filter((value) => /\d+\.\d{3,}/.test(value)),
		);
		expect(precise.length).toBeGreaterThan(0);
	});
});
