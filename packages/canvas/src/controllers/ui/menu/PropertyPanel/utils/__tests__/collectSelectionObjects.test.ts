import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import { collectSelectionObjects } from "../collectSelectionObjects";

const rect = (id: string): ObjectState =>
	({ id, type: "rect" }) as unknown as ObjectState;

const group = (id: string, childIds: string[]): GroupState =>
	({ id, type: "group", childIds }) as unknown as GroupState;

const idsOf = (objects: ObjectState[]): string[] =>
	objects.map((object) => object.id);

describe("collectSelectionObjects", () => {
	it("empty selection → nothing", () => {
		expect(collectSelectionObjects([], {})).toEqual([]);
	});

	it("keeps the selection order", () => {
		const objects = { a: rect("a"), b: rect("b") };
		expect(idsOf(collectSelectionObjects(["b", "a"], objects))).toEqual([
			"b",
			"a",
		]);
	});

	it("an id no object answers to is skipped", () => {
		expect(idsOf(collectSelectionObjects(["gone"], {}))).toEqual([]);
	});

	it("a selected group is followed by its descendants", () => {
		const objects = {
			g: group("g", ["inner", "a"]),
			inner: group("inner", ["b"]),
			a: rect("a"),
			b: rect("b"),
		};
		expect(idsOf(collectSelectionObjects(["g"], objects))).toEqual([
			"g",
			"inner",
			"a",
			"b",
		]);
	});
});
