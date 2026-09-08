import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import { readSelectionValue } from "../readSelectionValue";

const shape = (id: string, value?: string): ObjectState =>
	({ id, type: "rect", value }) as unknown as ObjectState;

const group = (id: string, childIds: string[]): GroupState =>
	({ id, type: "group", childIds }) as unknown as GroupState;

/** Reads the fixture's own `value` field; undefined for a shape that carries none. */
const readValue = (object: ObjectState): string | undefined =>
	(object as unknown as { value?: string }).value;

describe("readSelectionValue", () => {
	it("empty selection → none", () => {
		expect(readSelectionValue([], {}, readValue)).toEqual({ kind: "none" });
	});

	it("one object carrying the value → single", () => {
		const objects = { a: shape("a", "x") };
		expect(readSelectionValue(["a"], objects, readValue)).toEqual({
			kind: "single",
			value: "x",
		});
	});

	it("several objects agreeing → single", () => {
		const objects = { a: shape("a", "x"), b: shape("b", "x") };
		expect(readSelectionValue(["a", "b"], objects, readValue)).toEqual({
			kind: "single",
			value: "x",
		});
	});

	it("objects disagreeing → mixed", () => {
		const objects = { a: shape("a", "x"), b: shape("b", "y") };
		expect(readSelectionValue(["a", "b"], objects, readValue)).toEqual({
			kind: "mixed",
		});
	});

	it("the reader returning undefined for every object of the selection → none", () => {
		const objects = { a: shape("a"), b: shape("b") };
		expect(readSelectionValue(["a", "b"], objects, readValue)).toEqual({
			kind: "none",
		});
	});

	it("an object the reader has nothing to say about does not pull the selection to mixed", () => {
		const objects = { a: shape("a", "x"), b: shape("b") };
		expect(readSelectionValue(["a", "b"], objects, readValue)).toEqual({
			kind: "single",
			value: "x",
		});
	});

	it("descendants of a selected group are read too, so they can disagree", () => {
		const objects = {
			g: group("g", ["a", "b"]),
			a: shape("a", "x"),
			b: shape("b", "y"),
		};
		expect(readSelectionValue(["g"], objects, readValue)).toEqual({
			kind: "mixed",
		});
	});
});
