import type { IconSetDrawing, IconSetNode } from "@jiscribe/canvas-sdk/doc";
import { describe, expect, it } from "vitest";

import { AZURE_ICON_CATALOG_ENTRIES } from "../../schema/icon/iconCatalog.generated";
import { AZURE_ICON_DRAWINGS } from "../iconDrawings.generated";

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

const allNodes = Object.values(AZURE_ICON_DRAWINGS).flatMap(listDrawingNodes);

describe("AZURE_ICON_DRAWINGS", () => {
	it("draws Microsoft Entra ID, from Entra's own package", () => {
		expect(AZURE_ICON_DRAWINGS["entra-id"]?.nodes.length).toBeGreaterThan(0);
	});

	it("draws exactly the icons the catalog names", () => {
		expect(Object.keys(AZURE_ICON_DRAWINGS).sort()).toEqual(
			Object.keys(AZURE_ICON_CATALOG_ENTRIES).sort(),
		);
	});

	it("gives every icon at least one node and no dark rendition", () => {
		const odd = Object.entries(AZURE_ICON_DRAWINGS).filter(
			([, drawing]) =>
				drawing.nodes.length === 0 || drawing.darkNodes !== undefined,
		);
		expect(odd).toEqual([]);
	});

	// Most icons fill with gradients, so most drawings define ids; IconSetArt
	// suffixes them per instance from this list.
	it("lists in idRefs exactly the ids each drawing defines, each referred to", () => {
		const mismatched = Object.entries(AZURE_ICON_DRAWINGS).filter(
			([, drawing]) => {
				const nodes = listDrawingNodes(drawing);
				const defined = nodes.flatMap(([, attrs]) =>
					attrs.id === undefined ? [] : [attrs.id],
				);
				const referenced = new Set(
					nodes.flatMap(([, attrs]) =>
						Object.entries(attrs).flatMap(([name, value]) =>
							name === "id" ? [] : readReferences(name, value),
						),
					),
				);
				return (
					defined.some((id) => !referenced.has(id)) ||
					JSON.stringify([...defined].sort()) !==
						JSON.stringify([...(drawing.idRefs ?? [])].sort())
				);
			},
		);
		expect(mismatched).toEqual([]);
		expect(
			Object.values(AZURE_ICON_DRAWINGS).filter(
				(drawing) => (drawing.idRefs ?? []).length > 0,
			).length,
		).toBeGreaterThan(500);
	});

	it("names every id uniquely across the set and points every reference into its own drawing", () => {
		const ids = allNodes.flatMap(([, attrs]) =>
			attrs.id === undefined ? [] : [attrs.id],
		);
		expect(new Set(ids).size).toBe(ids.length);

		const dangling = Object.entries(AZURE_ICON_DRAWINGS).flatMap(
			([name, drawing]) => {
				const nodes = listDrawingNodes(drawing);
				const declared = new Set(nodes.map(([, attrs]) => attrs.id));
				return nodes.flatMap(([, attrs]) =>
					Object.entries(attrs)
						.flatMap(([attrName, value]) =>
							attrName === "id" ? [] : readReferences(attrName, value),
						)
						.filter((id) => !declared.has(id))
						.map((id) => `${name} → #${id}`),
				);
			},
		);
		expect(dangling).toEqual([]);
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

	// The drawings are redistributed unmodified (LICENSE-ICONS.md): nothing
	// rounds their coordinates.
	it("keeps the path data at the precision Microsoft authored it in", () => {
		const precise = allNodes.flatMap(([, attrs]) =>
			Object.values(attrs).filter((value) => /\d+\.\d{3,}/.test(value)),
		);
		expect(precise.length).toBeGreaterThan(0);
	});
});
