import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import type { GroupDoc } from "@jiscribe/doc/model/objects/primitives/group/GroupDoc";
import { describe, expect, it } from "vitest";

import {
	groupToDoc,
	groupToState,
} from "../../objects/primitives/group/GroupMapper";
import {
	rectToDoc,
	rectToState,
} from "../../objects/primitives/rect/RectMapper";
import { createObjectContentResizerRegistry } from "../../registry/ObjectContentResizerRegistry";
import { createObjectMapperRegistry } from "../../registry/ObjectMapperRegistry";
import { canvasToDoc, canvasToState } from "../CanvasMapper";
import type { CanvasState } from "../CanvasState";

const registerMappers = (
	mapper: ReturnType<typeof createObjectMapperRegistry>,
) => {
	mapper.register(
		"group",
		{ toState: groupToState, toDoc: groupToDoc },
		{ type: "group", geometry: "none", transform: true },
	);
	mapper.register(
		"rect",
		{ toState: rectToState, toDoc: rectToDoc },
		{
			type: "rect",
			geometry: "rect",
			transform: true,
			stroke: true,
			fill: true,
		},
	);
};

const createMapper = (): ReturnType<typeof createObjectMapperRegistry> => {
	const mapper = createObjectMapperRegistry();
	registerMappers(mapper);
	return mapper;
};

// None of the types here derive their box from content, so this stays empty.
const contentResizer = createObjectContentResizerRegistry();

const rect = (id: string) => ({
	id,
	type: "rect",
	x: 0,
	y: 0,
	width: 10,
	height: 10,
});

/** A rect, a group of two rects, and a trailing rect — one node of every shape. */
const doc = {
	version: 1,
	root: [
		rect("rect-1"),
		{
			id: "group-1",
			type: "group",
			children: [rect("rect-2"), rect("rect-3")],
		},
		rect("rect-4"),
	],
} as unknown as CanvasDoc;

/**
 * The state a commit touching one object leaves behind: the map cloned with that
 * object replaced, every other object carried over by reference. What the edit
 * wrote does not matter here — the new identity is the whole signal the sharing
 * reads.
 */
const withObjectReplaced = (state: CanvasState, id: string): CanvasState => ({
	...state,
	objects: { ...state.objects, [id]: { ...state.objects[id] } },
});

const groupChildren = (converted: CanvasDoc) =>
	(converted.root[1] as GroupDoc).children;

describe("canvasToDoc node sharing", () => {
	it("reuses the node of an object the state still holds", () => {
		const mapper = createMapper();
		const state = canvasToState(doc, mapper, contentResizer);

		const first = canvasToDoc(state, mapper);
		const second = canvasToDoc(state, mapper);

		expect(second.root[0]).toBe(first.root[0]);
		expect(second.root[1]).toBe(first.root[1]);
		expect(groupChildren(second)[0]).toBe(groupChildren(first)[0]);
	});

	it("rebuilds the object an edit replaced and nothing else", () => {
		const mapper = createMapper();
		const state = canvasToState(doc, mapper, contentResizer);
		const first = canvasToDoc(state, mapper);

		const edited = canvasToDoc(withObjectReplaced(state, "rect-1"), mapper);

		expect(edited.root[0]).not.toBe(first.root[0]);
		expect(edited.root[1]).toBe(first.root[1]);
		expect(edited.root[2]).toBe(first.root[2]);
	});

	it("rebuilds the group above a changed child, keeping its untouched sibling", () => {
		const mapper = createMapper();
		const state = canvasToState(doc, mapper, contentResizer);
		const first = canvasToDoc(state, mapper);

		const edited = canvasToDoc(withObjectReplaced(state, "rect-2"), mapper);

		// The group's own state is untouched, so only the changed child forces it
		// to be rebuilt — which is why the entry cannot be keyed on the state alone.
		expect(edited.root[1]).not.toBe(first.root[1]);
		expect(groupChildren(edited)[0]).not.toBe(groupChildren(first)[0]);
		expect(groupChildren(edited)[1]).toBe(groupChildren(first)[1]);
		expect(edited.root[0]).toBe(first.root[0]);
	});

	it("keeps each canvas's nodes to itself", () => {
		const mapper = createMapper();
		const otherMapper = createMapper();
		const state = canvasToState(doc, mapper, contentResizer);

		const first = canvasToDoc(state, mapper);
		const other = canvasToDoc(state, otherMapper);

		expect(other.root[0]).not.toBe(first.root[0]);
	});

	it("starts over when the registrations changed under it", () => {
		const mapper = createMapper();
		const state = canvasToState(doc, mapper, contentResizer);
		const first = canvasToDoc(state, mapper);

		// A re-registration may convert the same state into something else, so
		// what was built before it is no longer reusable.
		registerMappers(mapper);
		const afterReregistration = canvasToDoc(state, mapper);

		expect(afterReregistration.root[0]).not.toBe(first.root[0]);
		expect(afterReregistration.root[0]).toEqual(first.root[0]);
	});
});
