import type { IconSetDrawing, IconSetNode } from "@jiscribe/canvas-sdk/doc";
import { describe, expect, it } from "vitest";

import { AWS_ICON_CATALOG_ENTRIES } from "../../schema/icon/iconCatalog.generated";
import { AWS_ICON_DRAWINGS } from "../iconDrawings.generated";

/** Flattens the node tree so the attributes can be looked at one by one. */
const walkNodes = function* (
	nodes: readonly IconSetNode[],
): Generator<IconSetNode> {
	for (const node of nodes) {
		yield node;
		yield* walkNodes(node[2] ?? []);
	}
};

/** Every node of a drawing, both renditions. */
const listDrawingNodes = (drawing: IconSetDrawing): IconSetNode[] => [
	...walkNodes([...drawing.nodes, ...(drawing.darkNodes ?? [])]),
];

/** The ids an attribute value refers to: `url(#…)` anywhere, and `href="#…"`. */
const readReferences = (name: string, value: string): string[] =>
	name === "href" && value.startsWith("#")
		? [value.slice(1)]
		: [...value.matchAll(/url\(#([^)]+)\)/g)].map(([, id]) => id);

const allNodes = Object.values(AWS_ICON_DRAWINGS).flatMap(listDrawingNodes);

describe("AWS_ICON_DRAWINGS", () => {
	it("draws exactly the icons the catalog names", () => {
		expect(Object.keys(AWS_ICON_DRAWINGS).sort()).toEqual(
			Object.keys(AWS_ICON_CATALOG_ENTRIES).sort(),
		);
	});

	it("gives every icon at least one node", () => {
		const empty = Object.entries(AWS_ICON_DRAWINGS).filter(
			([, drawing]) => drawing.nodes.length === 0,
		);
		expect(empty).toEqual([]);
	});

	// The generator keeps an id only where something in the same asset refers
	// to it, and lists it in idRefs so the renderer can suffix it per instance.
	it("keeps an id only where the drawing refers to it, and lists it in idRefs", () => {
		const mismatched = Object.entries(AWS_ICON_DRAWINGS).filter(
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
			Object.values(AWS_ICON_DRAWINGS).some(
				(drawing) => (drawing.idRefs ?? []).length > 0,
			),
		).toBe(true);
	});

	it("names every kept id uniquely across the set", () => {
		const ids = allNodes.flatMap(([, attrs]) =>
			attrs.id === undefined ? [] : [attrs.id],
		);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("points every reference at an element the same drawing carries", () => {
		const dangling = Object.entries(AWS_ICON_DRAWINGS).flatMap(
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

	it("points every clip-path at a clipPath", () => {
		const clipPathIds = new Set(
			allNodes
				.filter(([tag]) => tag === "clipPath")
				.map(([, attrs]) => attrs.id),
		);
		const misdirected = allNodes
			.map(([, attrs]) => attrs.clipPath)
			.filter((value) => value !== undefined)
			.filter(
				(value) => !clipPathIds.has(readReferences("clipPath", value)[0]),
			);
		expect(misdirected).toEqual([]);
	});

	// The drawings are redistributed unmodified (LICENSE-ICONS.md), so nothing
	// rounds their coordinates. AWS authors them at full precision, and finding
	// none would mean a rounding pass crept back into the generator.
	it("keeps the path data at the precision AWS authored it in", () => {
		const precise = allNodes.flatMap(([, attrs]) =>
			Object.values(attrs).filter((value) => /\d+\.\d{3,}/.test(value)),
		);
		expect(precise.length).toBeGreaterThan(0);
	});
});

describe("the light and dark renditions", () => {
	const paired = Object.entries(AWS_ICON_DRAWINGS).filter(
		([, drawing]) => drawing.darkNodes !== undefined,
	);

	// AWS ships a Dark file for the General icons, the two AWS Cloud group icons
	// and AWS Marketplace: the drawings whose ink is meant for a white ground.
	it("carries a dark rendition wherever the asset package ships one", () => {
		expect(paired.length).toBeGreaterThan(40);
		expect(AWS_ICON_DRAWINGS["general/user"]?.darkNodes).toBeDefined();
		expect(AWS_ICON_DRAWINGS["group/aws-cloud"]?.darkNodes).toBeDefined();
		expect(
			AWS_ICON_DRAWINGS["service/aws-marketplace"]?.darkNodes,
		).toBeDefined();
	});

	it("draws something different in the dark rendition", () => {
		const identical = paired.filter(
			([, drawing]) =>
				JSON.stringify(drawing.darkNodes) === JSON.stringify(drawing.nodes),
		);
		expect(identical).toEqual([]);
	});

	it("leaves the category-coloured icons a single rendition", () => {
		expect(AWS_ICON_DRAWINGS["service/aws-lambda"]?.darkNodes).toBeUndefined();
	});
});
