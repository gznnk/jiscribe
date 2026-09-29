import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { describe, expect, it } from "vitest";

import {
	connectorToDoc,
	connectorToState,
} from "../../objects/connector/ConnectorMapper";
import {
	groupToDoc,
	groupToState,
} from "../../objects/primitives/group/GroupMapper";
import type { GroupState } from "../../objects/primitives/group/GroupState";
import {
	rectToDoc,
	rectToState,
} from "../../objects/primitives/rect/RectMapper";
import { createObjectContentResizerRegistry } from "../../registry/ObjectContentResizerRegistry";
import { createObjectMapperRegistry } from "../../registry/ObjectMapperRegistry";
import { canvasToDoc, canvasToState } from "../CanvasMapper";
import type { CanvasState } from "../CanvasState";

const mapper = createObjectMapperRegistry();
mapper.register(
	"group",
	{ toState: groupToState, toDoc: groupToDoc },
	{ type: "group", geometry: "none", transform: true },
);
mapper.register(
	"rect",
	{ toState: rectToState, toDoc: rectToDoc },
	{ type: "rect", geometry: "rect", transform: true, stroke: true, fill: true },
);
mapper.register(
	"connector",
	{ toState: connectorToState, toDoc: connectorToDoc },
	{ type: "connector", geometry: "poly", stroke: true },
);
const contentResizer = createObjectContentResizerRegistry();

const rect = (id: string, x = 0) => ({
	id,
	type: "rect",
	x,
	y: 0,
	width: 10,
	height: 10,
});
/** A type the mapper does not carry, with fields of its own nothing here reads. */
const hexagram = (id: string) => ({
	id,
	type: "hexagram",
	x: 50,
	y: 50,
	spikes: 6,
	strokeDashType: "wavy",
	children: [{ id: `${id}-inner`, type: "hexagram-point" }],
});
const group = (id: string, children: unknown[]) => ({
	id,
	type: "group",
	children,
});
const connector = (id: string, sourceId: string, targetId: string) => ({
	id,
	type: "connector",
	source: { owner: { id: sourceId }, anchor: { kind: "center" } },
	target: { owner: { id: targetId }, anchor: { kind: "center" } },
});
const doc = (root: unknown[]): CanvasDoc =>
	({ version: 1, root }) as unknown as CanvasDoc;

const toState = (source: CanvasDoc): CanvasState =>
	canvasToState(source, mapper, contentResizer);

/** Round-trips through state and compares as JSON, which is what a save writes. */
const expectRoundTrip = (source: CanvasDoc): void => {
	expect(JSON.stringify(canvasToDoc(toState(source), mapper))).toBe(
		JSON.stringify(source),
	);
};

/** The state with `id` gone from the object map and from whatever held it. */
const withoutObject = (state: CanvasState, id: string): CanvasState => {
	const { [id]: _removed, ...objects } = state.objects;
	Object.entries(objects).forEach(([objectId, object]) => {
		if (object.type === "group") {
			const groupState = object as GroupState;
			objects[objectId] = {
				...groupState,
				childIds: groupState.childIds.filter((childId) => childId !== id),
			} as GroupState;
		}
	});
	return {
		...state,
		objects,
		rootIds: state.rootIds.filter((rootId) => rootId !== id),
	};
};

const rootIdsOf = (source: CanvasDoc): string[] =>
	source.root.map((object) => object.id);

describe("canvasToState / canvasToDoc: objects of a type the mapper does not carry", () => {
	it("holds them out of the object map and writes them back unchanged, in place", () => {
		const source = doc([
			hexagram("h1"),
			rect("r1"),
			hexagram("h2"),
			group("g1", [rect("r2"), hexagram("h3"), rect("r3")]),
			hexagram("h4"),
		]);

		const state = toState(source);

		expect(Object.keys(state.objects).sort()).toEqual(["g1", "r1", "r2", "r3"]);
		expect(state.rootIds).toEqual(["r1", "g1"]);
		expect((state.objects.g1 as GroupState).childIds).toEqual(["r2", "r3"]);
		expect(state.opaqueObjects?.map(({ doc: held }) => held.id)).toEqual([
			"h1",
			"h2",
			"h3",
			"h4",
		]);
		expectRoundTrip(source);
	});

	it("holds a group whose children are all opaque as a whole", () => {
		const source = doc([rect("r1"), group("g1", [hexagram("h1")])]);

		const state = toState(source);

		expect(state.objects.g1).toBeUndefined();
		expect(state.opaqueObjects?.map(({ doc: held }) => held.id)).toEqual([
			"g1",
		]);
		expectRoundTrip(source);
	});

	it("holds a connector with an end on an opaque object, or on what it holds", () => {
		const source = doc([
			rect("r1"),
			rect("r2", 100),
			hexagram("h1"),
			connector("c1", "r1", "h1"),
			connector("c2", "r1", "h1-inner"),
			connector("c3", "r1", "r2"),
		]);

		const state = toState(source);

		expect(state.rootIds).toEqual(["r1", "r2", "c3"]);
		expect(state.opaqueObjects?.map(({ doc: held }) => held.id)).toEqual([
			"h1",
			"c1",
			"c2",
		]);
		expectRoundTrip(source);
	});

	it("leaves opaqueObjects out entirely for a document of known types", () => {
		expect(toState(doc([rect("r1")])).opaqueObjects).toBeUndefined();
	});

	it("puts one after the nearest earlier sibling still there when the one right before it is gone", () => {
		const state = withoutObject(
			toState(doc([rect("r1"), rect("r2"), hexagram("h1"), rect("r3")])),
			"r2",
		);

		expect(rootIdsOf(canvasToDoc(state, mapper))).toEqual(["r1", "h1", "r3"]);
	});

	it("follows the sibling it was placed after when that sibling is restacked", () => {
		const state = toState(doc([rect("r1"), hexagram("h1"), rect("r2")]));

		const restacked = { ...state, rootIds: ["r2", "r1"] };

		expect(rootIdsOf(canvasToDoc(restacked, mapper))).toEqual([
			"r2",
			"r1",
			"h1",
		]);
	});

	it("lands where its group was when the group is gone around it", () => {
		const state = toState(
			doc([
				rect("r1"),
				group("g1", [rect("r2"), hexagram("h1")]),
				hexagram("h2"),
				rect("r3"),
			]),
		);
		// Ungrouped: the group goes and its known child is lifted to the root.
		const { g1: _group, ...objects } = state.objects;
		const ungrouped: CanvasState = {
			...state,
			objects: { ...objects, r2: { ...objects.r2, parentId: undefined } },
			rootIds: ["r1", "r2", "r3"],
		};

		expect(rootIdsOf(canvasToDoc(ungrouped, mapper))).toEqual([
			"r1",
			"h1",
			"h2",
			"r2",
			"r3",
		]);
	});

	it("drops an opaque connector whose other end was deleted, and nothing else", () => {
		const state = withoutObject(
			toState(doc([rect("r1"), hexagram("h1"), connector("c1", "r1", "h1")])),
			"r1",
		);

		expect(rootIdsOf(canvasToDoc(state, mapper))).toEqual(["h1"]);
	});
});
