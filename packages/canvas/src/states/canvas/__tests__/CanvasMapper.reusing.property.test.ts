import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { createCanvasParser } from "@jiscribe/doc/parse";
import { describe, expect, it } from "vitest";

import { createInitialControllerState } from "../../../controllers/reducer/createInitialControllerState";
import { createTestRegistries } from "../../../controllers/registries/createCanvasRegistries";
import {
	createDocSnapshotFromState,
	resolveDocSnapshot,
} from "../../../controllers/utils/resolveDocSnapshot";
import {
	canvasToDoc,
	canvasToState,
	canvasToStateReusing,
} from "../CanvasMapper";

/**
 * Whatever an external edit does to a document, the state built reusing the
 * canvas's objects is the state a full rebuild gives.
 */

const registries = createTestRegistries();
const { objectMapper, objectContentResizer } = registries;

type JsonNode = Record<string, unknown> & { id: string; type: string };

/** Deterministic PRNG (mulberry32), so a failing seed reproduces. */
const createRandom = (seed: number): (() => number) => {
	let current = seed >>> 0;
	return () => {
		current = (current + 0x6d2b79f5) >>> 0;
		let mixed = current;
		mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
		mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
		return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
	};
};

const COLORS = ["#ff0000", "#00aa00", "#0000ff", "#333333"];

const leafDoc = (id: string, random: () => number): JsonNode => {
	const x = Math.round(random() * 800);
	const y = Math.round(random() * 600);
	const roll = random();
	if (roll < 0.4) {
		return { id, type: "rect", x, y, width: 40, height: 30 };
	}
	if (roll < 0.7) {
		return { id, type: "ellipse", cx: x, cy: y, rx: 25, ry: 20 };
	}
	return { id, type: "text", x, y, text: `Text ${id}` };
};

/** Rects, ellipses and texts at the root and in (nested) groups, connectors between them, and one opaque object. */
const createBaseDoc = (random: () => number): CanvasDoc => {
	const root: JsonNode[] = [];
	for (let index = 0; index < 8; index += 1) {
		root.push(leafDoc(`leaf-${index}`, random));
	}
	root.push({
		id: "group-a",
		type: "group",
		children: [
			leafDoc("in-a-1", random),
			leafDoc("in-a-2", random),
			{
				id: "group-b",
				type: "group",
				children: [leafDoc("in-b-1", random), leafDoc("in-b-2", random)],
			},
		],
	});
	root.push({
		id: "group-c",
		type: "group",
		rotation: 30,
		children: [leafDoc("in-c-1", random), leafDoc("in-c-2", random)],
	});
	root.push({ id: "unknown-1", type: "hexagram", x: 10, y: 10 });
	root.push(
		{
			id: "conn-1",
			type: "connector",
			source: { owner: { id: "leaf-0" }, anchor: { kind: "center" } },
			target: { owner: { id: "in-b-1" }, anchor: { kind: "center" } },
		},
		{
			id: "conn-2",
			type: "connector",
			points: [{ x: 300, y: 300 }],
			source: { owner: { id: "leaf-1" }, anchor: { kind: "center" } },
			target: { anchor: { kind: "free", point: { x: 900, y: 50 } } },
			label: { text: "flows" },
		},
	);
	return { version: 1, root } as unknown as CanvasDoc;
};

/** Every container in the tree (the root as a pseudo group), and every node with its container. */
const listNodes = (
	root: JsonNode[],
): {
	containers: JsonNode[][];
	nodes: { node: JsonNode; siblings: JsonNode[] }[];
} => {
	const containers: JsonNode[][] = [root];
	const nodes: { node: JsonNode; siblings: JsonNode[] }[] = [];
	const visit = (siblings: JsonNode[]): void => {
		siblings.forEach((node) => {
			nodes.push({ node, siblings });
			if (node.type === "group") {
				const children = node.children as JsonNode[];
				containers.push(children);
				visit(children);
			}
		});
	};
	visit(root);
	return { containers, nodes };
};

const pick = <T>(items: readonly T[], random: () => number): T =>
	items[Math.floor(random() * items.length)];

/** Ids some connector ends on; deleting one would leave a dangling end. */
const collectOwnerIds = (root: JsonNode[]): Set<string> => {
	const ownerIds = new Set<string>();
	root
		.filter((node) => node.type === "connector")
		.forEach((connector) => {
			[connector.source, connector.target].forEach((endpoint) => {
				const ownerId = (endpoint as { owner?: { id: string } }).owner?.id;
				if (ownerId !== undefined) {
					ownerIds.add(ownerId);
				}
			});
		});
	return ownerIds;
};

const reverseKeys = (node: JsonNode): JsonNode =>
	Object.fromEntries(Object.entries(node).reverse()) as JsonNode;

let addedCount = 0;

/** One random external edit, applied in place to a deep copy of a document's root. */
const applyRandomEdit = (root: JsonNode[], random: () => number): void => {
	const { containers, nodes } = listNodes(root);
	const leaves = nodes.filter(
		({ node }) =>
			node.type !== "group" &&
			node.type !== "connector" &&
			node.type !== "hexagram",
	);
	const connectors = root.filter((node) => node.type === "connector");
	const replaceNode = (
		siblings: JsonNode[],
		node: JsonNode,
		next: JsonNode,
	): void => {
		siblings[siblings.indexOf(node)] = next;
	};
	const edit = Math.floor(random() * 11);
	switch (edit) {
		case 0: {
			const { node, siblings } = pick(leaves, random);
			const [xKey, yKey] = node.type === "ellipse" ? ["cx", "cy"] : ["x", "y"];
			replaceNode(siblings, node, {
				...node,
				[xKey]: (node[xKey] as number) + 7,
				[yKey]: (node[yKey] as number) - 3,
			});
			return;
		}
		case 1: {
			const { node, siblings } = pick(leaves, random);
			if (node.type === "text") {
				replaceNode(siblings, node, { ...node, text: `${String(node.text)}!` });
				return;
			}
			const [widthKey, heightKey] =
				node.type === "ellipse" ? ["rx", "ry"] : ["width", "height"];
			replaceNode(siblings, node, {
				...node,
				[widthKey]: (node[widthKey] as number) + 12,
				[heightKey]: (node[heightKey] as number) + 5,
			});
			return;
		}
		case 2: {
			const { node, siblings } = pick(leaves, random);
			replaceNode(siblings, node, { ...node, fill: pick(COLORS, random) });
			return;
		}
		case 3: {
			addedCount += 1;
			pick(containers, random).push(leafDoc(`added-${addedCount}`, random));
			return;
		}
		case 4: {
			const ownerIds = collectOwnerIds(root);
			const deletable = leaves.filter(
				({ node, siblings }) => !ownerIds.has(node.id) && siblings.length > 1,
			);
			if (deletable.length === 0) {
				return;
			}
			const { node, siblings } = pick(deletable, random);
			siblings.splice(siblings.indexOf(node), 1);
			return;
		}
		case 5: {
			// Regroup: move a leaf into another container
			const movable = leaves.filter(({ siblings }) => siblings.length > 1);
			if (movable.length === 0) {
				return;
			}
			const { node, siblings } = pick(movable, random);
			siblings.splice(siblings.indexOf(node), 1);
			const target = pick(
				containers.filter((container) => container !== siblings),
				random,
			);
			target.splice(Math.floor(random() * (target.length + 1)), 0, node);
			return;
		}
		case 6: {
			const connector = pick(connectors, random);
			const sourceOwnerId = (connector.source as { owner?: { id: string } })
				.owner?.id;
			const candidates = leaves
				.map(({ node }) => node.id)
				.filter((id) => id !== sourceOwnerId);
			replaceNode(root, connector, {
				...connector,
				target: {
					owner: { id: pick(candidates, random) },
					anchor: { kind: "center" },
				},
			});
			return;
		}
		case 7: {
			const connector = pick(connectors, random);
			replaceNode(root, connector, {
				...connector,
				label: { text: `label ${Math.round(random() * 100)}` },
			});
			return;
		}
		case 8: {
			const connector = pick(connectors, random);
			replaceNode(root, connector, {
				...connector,
				points: [
					{ x: Math.round(random() * 500), y: Math.round(random() * 500) },
				],
			});
			return;
		}
		case 9: {
			const container = pick(containers, random);
			if (container.length > 1) {
				const [moved] = container.splice(0, 1);
				container.push(moved);
			}
			return;
		}
		default: {
			// Same content, other key order: nothing to rebuild
			const { node, siblings } = pick(nodes, random);
			replaceNode(siblings, node, reverseKeys(node));
		}
	}
};

const cloneDoc = (doc: CanvasDoc): CanvasDoc =>
	JSON.parse(JSON.stringify(doc)) as CanvasDoc;

const parse = (doc: CanvasDoc): CanvasDoc => {
	const result = createCanvasParser().parse(JSON.stringify(doc));
	if (result.kind !== "ok") {
		throw new Error(`generated an invalid doc: ${JSON.stringify(result)}`);
	}
	return result.doc as CanvasDoc;
};

/** JSON with every object's keys sorted, so key order does not count. */
const stringifySorted = (value: unknown): string =>
	JSON.stringify(value, (_key, nested: unknown) =>
		typeof nested === "object" && nested !== null && !Array.isArray(nested)
			? Object.fromEntries(
					Object.entries(nested).sort(([left], [right]) =>
						left.localeCompare(right),
					),
				)
			: nested,
	);

const documentFields = (state: ReturnType<typeof canvasToState>) => ({
	objects: state.objects,
	rootIds: state.rootIds,
	background: state.background,
	view: state.view,
	opaqueObjects: state.opaqueObjects,
});

describe("canvasToStateReusing (property)", () => {
	const TRIALS = 200;

	it.each([
		["the opened document", true],
		["a document converted from the committed state", false],
	])(
		"builds what canvasToState builds, against %s",
		(_label, isOpenedReference) => {
			let reusedCount = 0;
			for (let seed = 1; seed <= TRIALS; seed += 1) {
				const random = createRandom(seed);
				const baseDoc = parse(createBaseDoc(random));
				const opened = createInitialControllerState(baseDoc, registries);
				const present = isOpenedReference
					? opened.history.present
					: createDocSnapshotFromState(opened.history.present.source);
				const referenceDoc = resolveDocSnapshot(present, objectMapper);
				if (!isOpenedReference) {
					expect(referenceDoc).toEqual(
						canvasToDoc(present.source, objectMapper),
					);
				}

				const incoming = cloneDoc(baseDoc);
				const editCount = 1 + Math.floor(random() * 4);
				for (let index = 0; index < editCount; index += 1) {
					applyRandomEdit(incoming.root as unknown as JsonNode[], random);
				}
				const incomingDoc = parse(incoming);

				const reused = canvasToStateReusing(
					incomingDoc,
					objectMapper,
					objectContentResizer,
					{
						referenceDoc,
						committedObjects: present.source.objects,
						liveObjects: opened.objects,
						remeasure: false,
					},
				);
				const rebuilt = canvasToState(
					incomingDoc,
					objectMapper,
					objectContentResizer,
				);

				expect(documentFields(reused.state), `seed ${seed}`).toStrictEqual(
					documentFields(rebuilt),
				);
				expect(reused.isSameAsReference, `seed ${seed}`).toBe(
					stringifySorted(incomingDoc) === stringifySorted(referenceDoc),
				);
				reusedCount += Object.entries(reused.state.objects).filter(
					([id, objState]) => objState === opened.objects[id],
				).length;
			}
			// Guards against a pass that passes by rebuilding everything
			expect(reusedCount).toBeGreaterThan(TRIALS * 5);
		},
	);
});
