import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { createCanvasParser } from "@jiscribe/doc/parse";
import type { TextMeasurement } from "@jiscribe/doc/text/measure/TextMeasurement";
import {
	advanceTextMeasurementGeneration,
	offerTextMeasurement,
	readTextMeasurementGeneration,
	resetTextMeasurementForTests,
} from "@jiscribe/doc/text/measure/textMeasurementSlot";
import { beforeEach, describe, expect, it } from "vitest";

import { deepFreezeState } from "../../../controllers/__tests__/support/deepFreezeState";
import type { CanvasControllerState } from "../../../controllers/CanvasTypes";
import type { CanvasAction } from "../../../controllers/reducer/CanvasActions";
import { createCanvasReducer } from "../../../controllers/reducer/canvasReducer";
import { createInitialControllerState } from "../../../controllers/reducer/createInitialControllerState";
import { createTestRegistries } from "../../../controllers/registries/createCanvasRegistries";
import {
	createDocSnapshotFromState,
	resolveDocSnapshot,
} from "../../../controllers/utils/resolveDocSnapshot";
import type { ObjectState } from "../../objects/base/ObjectState";
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
const canvasReducer = createCanvasReducer(registries);

/** Width per character per px of font size; raised by {@link loadWiderFace}. */
let characterWidthRatio = 0.5;

/** A renderer stand-in whose answers change when a face loads, so a re-measure is observable. */
const switchingMeasurement: TextMeasurement = {
	source: "renderer",
	createMeasurer: (font) => (text) =>
		text.length * font.fontSize * characterWidthRatio,
};

resetTextMeasurementForTests();
offerTextMeasurement(switchingMeasurement);

/** What the browser host does when a face finishes loading (Canvas, useDocFonts). */
const loadWiderFace = (): void => {
	characterWidthRatio = 0.9;
	advanceTextMeasurementGeneration();
};

beforeEach(() => {
	characterWidthRatio = 0.5;
});

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
	if (roll < 0.2) {
		return { id, type: "rect", x, y, width: 40, height: 30 };
	}
	if (roll < 0.4) {
		// A body text, so toggleAutoHeight / toggleBold have something to act on
		return { id, type: "rect", x, y, width: 80, height: 30, text: `Box ${id}` };
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
	const edit = Math.floor(random() * 13);
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
		case 10: {
			const opaque = nodes.find(({ node }) => node.type === "hexagram");
			if (opaque !== undefined) {
				replaceNode(opaque.siblings, opaque.node, {
					...opaque.node,
					x: (opaque.node.x as number) + 1,
				});
			}
			return;
		}
		case 11: {
			// Move the opaque object into another container
			const opaque = nodes.find(({ node }) => node.type === "hexagram");
			if (opaque === undefined) {
				return;
			}
			opaque.siblings.splice(opaque.siblings.indexOf(opaque.node), 1);
			const target = pick(
				containers.filter((container) => container !== opaque.siblings),
				random,
			);
			target.splice(Math.floor(random() * (target.length + 1)), 0, opaque.node);
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

/** Ids of every object of a kind, in map order. */
const idsOfType = (
	state: CanvasControllerState,
	predicate: (objState: ObjectState) => boolean,
): string[] =>
	Object.values(state.objects)
		.filter(predicate)
		.map((objState) => objState.id);

/**
 * One random local edit, committed through the reducer as the canvas would:
 * a selection, then a command. A command that does not apply to what was
 * picked leaves the state as it is, which is a case worth keeping too.
 */
const applyRandomLocalCommit = (
	state: CanvasControllerState,
	random: () => number,
): CanvasControllerState => {
	const groups = idsOfType(state, (objState) => objState.type === "group");
	const texts = idsOfType(
		state,
		(objState) => objState.type === "text" || objState.type === "rect",
	);
	const rootLeaves = state.rootIds.filter(
		(id) => !["group", "connector"].includes(state.objects[id].type),
	);
	const connectors = idsOfType(
		state,
		(objState) => objState.type === "connector",
	);
	const select = (ids: string[], ...commandIds: string[]): CanvasAction[] => [
		{ type: "SET_SELECTION", ids },
		...commandIds.map((commandId): CanvasAction => ({
			type: "COMMAND",
			commandId,
		})),
	];
	const choices: (() => CanvasAction[])[] = [
		// Moves include the rotated group whenever it is still there
		() =>
			select(
				[pick(state.rootIds, random)],
				pick(["move-right", "move-down"], random),
			),
		() => (groups.length > 0 ? select([pick(groups, random)], "ungroup") : []),
		() =>
			rootLeaves.length > 1
				? select([rootLeaves[0], rootLeaves[rootLeaves.length - 1]], "group")
				: [],
		() => select([pick(texts, random)], "toggleAutoHeight"),
		() => select([pick(texts, random)], "toggleTextLayout"),
		() => select([pick(texts, random)], "toggleBold"),
		() => select([pick(rootLeaves, random)], "duplicate"),
		() =>
			select(
				[pick(connectors, random)],
				pick(
					["setRoutingStraight", "setRoutingOrthogonal", "swapArrows"],
					random,
				),
			),
	];
	return pick(choices, random)().reduce(
		(current, action) => canvasReducer(current, action),
		state,
	);
};

/** The base document opened, then edited locally 1–3 times. */
const openAndEditLocally = (random: () => number): CanvasControllerState => {
	let state = createInitialControllerState(
		parse(createBaseDoc(random)),
		registries,
	);
	const commitCount = 1 + Math.floor(random() * 3);
	for (let index = 0; index < commitCount; index += 1) {
		state = applyRandomLocalCommit(state, random);
	}
	// Frozen, so a write to a state the pass reuses throws
	return deepFreezeState(state);
};

/** Builds `doc` reusing `state`, as useSyncExternalDoc does. */
const buildReusing = (
	state: CanvasControllerState,
	doc: CanvasDoc,
	liveObjects: Readonly<Record<string, ObjectState>> = state.objects,
) =>
	canvasToStateReusing(doc, objectMapper, objectContentResizer, {
		referenceDoc: resolveDocSnapshot(state.history.present, objectMapper),
		committedObjects: state.history.present.source.objects,
		liveObjects,
		remeasure:
			state.history.present.textMeasurementGeneration !==
			readTextMeasurementGeneration(),
	});

const savedDocOf = (state: CanvasControllerState): CanvasDoc =>
	resolveDocSnapshot(state.history.present, objectMapper);

/** The saved doc with random external edits, read back as the host would. */
const editExternally = (doc: CanvasDoc, random: () => number): CanvasDoc => {
	const incoming = cloneDoc(doc);
	const editCount = 1 + Math.floor(random() * 4);
	for (let index = 0; index < editCount; index += 1) {
		applyRandomEdit(incoming.root as unknown as JsonNode[], random);
	}
	return parse(incoming);
};

describe("canvasToStateReusing after local commits (property)", () => {
	const TRIALS = 150;

	it("reads the saved doc echoed back as unchanged, keeping every object", () => {
		let committedCount = 0;
		for (let seed = 1; seed <= TRIALS; seed += 1) {
			const local = openAndEditLocally(createRandom(seed));
			if (local.history.past.length > 0) {
				committedCount += 1;
			}

			const { state, isSameAsReference } = buildReusing(
				local,
				parse(savedDocOf(local)),
			);

			expect(isSameAsReference, `seed ${seed}`).toBe(true);
			expect(Object.keys(state.objects).sort(), `seed ${seed}`).toEqual(
				Object.keys(local.objects).sort(),
			);
			Object.entries(state.objects).forEach(([id, objState]) => {
				expect(objState, `seed ${seed}: ${id}`).toBe(local.objects[id]);
			});
		}
		// Guards against trials whose commands all missed
		expect(committedCount).toBeGreaterThan(TRIALS / 2);
	});

	it("builds what canvasToState builds for the saved doc edited externally", () => {
		let reusedCount = 0;
		for (let seed = 1; seed <= TRIALS; seed += 1) {
			const random = createRandom(seed);
			const local = openAndEditLocally(random);
			const incomingDoc = editExternally(savedDocOf(local), random);

			const reused = buildReusing(local, incomingDoc);
			const rebuilt = canvasToState(
				incomingDoc,
				objectMapper,
				objectContentResizer,
			);

			expect(documentFields(reused.state), `seed ${seed}`).toStrictEqual(
				documentFields(rebuilt),
			);
			expect(reused.isSameAsReference, `seed ${seed}`).toBe(
				stringifySorted(incomingDoc) === stringifySorted(savedDocOf(local)),
			);
			reusedCount += Object.entries(reused.state.objects).filter(
				([id, objState]) => objState === local.objects[id],
			).length;
		}
		expect(reusedCount).toBeGreaterThan(TRIALS * 5);
	});

	it("rebuilds the objects whose live state moved on from the committed one", () => {
		for (let seed = 1; seed <= TRIALS; seed += 1) {
			const random = createRandom(seed);
			const local = openAndEditLocally(random);
			const incomingDoc = editExternally(savedDocOf(local), random);
			// What a drag preview leaves in the live state
			const divergedIds = [
				pick(Object.keys(local.objects), random),
				pick(Object.keys(local.objects), random),
			];
			const liveObjects = { ...local.objects };
			divergedIds.forEach((id) => {
				liveObjects[id] = { ...liveObjects[id], cx: 9999 } as ObjectState;
			});

			const reused = buildReusing(local, incomingDoc, liveObjects);

			expect(documentFields(reused.state), `seed ${seed}`).toStrictEqual(
				documentFields(
					canvasToState(incomingDoc, objectMapper, objectContentResizer),
				),
			);
			divergedIds.forEach((id) => {
				expect(reused.state.objects[id], `seed ${seed}: ${id}`).not.toBe(
					liveObjects[id],
				);
			});
		}
	});

	it("re-measures what it keeps once a face loaded since the entry was measured", () => {
		let remeasuredCount = 0;
		for (let seed = 1; seed <= TRIALS; seed += 1) {
			characterWidthRatio = 0.5;
			const random = createRandom(seed);
			const local = openAndEditLocally(random);
			const incomingDoc = editExternally(savedDocOf(local), random);
			loadWiderFace();

			const reused = buildReusing(local, incomingDoc);
			const rebuilt = canvasToState(
				incomingDoc,
				objectMapper,
				objectContentResizer,
			);

			expect(documentFields(reused.state), `seed ${seed}`).toStrictEqual(
				documentFields(rebuilt),
			);
			// Not vacuous: without the re-measure some kept object would differ
			const stale = canvasToStateReusing(
				incomingDoc,
				objectMapper,
				objectContentResizer,
				{
					referenceDoc: savedDocOf(local),
					committedObjects: local.history.present.source.objects,
					liveObjects: local.objects,
					remeasure: false,
				},
			);
			remeasuredCount += Object.keys(rebuilt.objects).filter(
				(id) =>
					stringifySorted(stale.state.objects[id]) !==
					stringifySorted(rebuilt.objects[id]),
			).length;
		}
		expect(remeasuredCount).toBeGreaterThan(0);
	});
});
