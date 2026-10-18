import type {
	ObjectDoc,
	ObjectState,
	ObjectTypeDefinition,
} from "@jiscribe/canvas";
import type { Dimensions } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import {
	braceDefinition,
	bracketDefinition,
	bracketWithStemDefinition,
} from "../definitions";
import type { BraceDoc } from "../schema/brace/BraceDoc";
import type { BracketDoc } from "../schema/bracket/BracketDoc";
import type { BracketWithStemDoc } from "../schema/bracketWithStem/BracketWithStemDoc";

// The doc side declares the ids a group marker offers without the presentation;
// this pins it to what extraConnectPoints places on the same doc.
const expectDeclaredIdsMatchPlaced = <
	TDoc extends ObjectDoc,
	TState extends ObjectState & Dimensions,
>(
	definition: ObjectTypeDefinition<TDoc, TState>,
	doc: TDoc,
): void => {
	const placedIds = definition
		.extraConnectPoints?.(definition.mapper.toState(doc))
		.map((point) => point.id);
	expect(placedIds).toHaveLength(1);
	expect(definition.extraConnectPointIds?.(doc)).toEqual(placedIds);
};

describe("group marker extraConnectPointIds", () => {
	it("lists the ids the presentation places on a brace", () => {
		expectDeclaredIdsMatchPlaced(braceDefinition, {
			id: "brace-1",
			type: "brace",
			x: 0,
			y: 0,
			width: 24,
			height: 160,
			direction: "left",
			tipPosition: 0.25,
		} as BraceDoc);
	});

	it("lists the ids the presentation places on a bracket", () => {
		expectDeclaredIdsMatchPlaced(bracketDefinition, {
			id: "bracket-1",
			type: "bracket",
			x: 0,
			y: 0,
			width: 160,
			height: 24,
			direction: "down",
		} as BracketDoc);
	});

	it("lists the ids the presentation places on a bracketWithStem", () => {
		expectDeclaredIdsMatchPlaced(bracketWithStemDefinition, {
			id: "bracket-with-stem-1",
			type: "bracketWithStem",
			x: 0,
			y: 0,
			width: 24,
			height: 160,
		} as BracketWithStemDoc);
	});
});
