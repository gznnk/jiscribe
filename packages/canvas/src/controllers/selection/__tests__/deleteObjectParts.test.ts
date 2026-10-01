import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import type { ObjectPartTarget } from "../deleteObjectParts";
import { canDeleteObjectParts, deleteObjectParts } from "../deleteObjectParts";
import type { ObjectPartKindDefinition } from "../ObjectPartKindRegistry";
import { createObjectPartKindRegistry } from "../ObjectPartKindRegistry";

/** A shape carrying a list of parts addressed by their index, as a poly does. */
type ListState = ObjectState & { items: string[] };

const makeList = (id: string, items: string[]): ListState =>
	({ id, type: "polyline", items }) as unknown as ListState;

const makeState = (objects: Record<string, ObjectState>) =>
	({
		objects,
		selectedIds: [],
		selectedVertex: null,
		lastDuplicate: "dup",
		commitVersion: 7,
	}) as unknown as CanvasControllerState;

const targetOf = (partIds: string[]): ObjectPartTarget => ({
	objectId: "a",
	kind: "item",
	partIds,
});

/** Removes the named indices, refusing to leave fewer than `floor` behind. */
const itemPart = (floor: number): ObjectPartKindDefinition<ListState> => ({
	kind: "item",
	has: (object, partId) => Number(partId) < object.items.length,
	delete: (object, partIds) => {
		const removed = new Set(partIds.map(Number));
		if (object.items.length - removed.size < floor) {
			return null;
		}
		return {
			...object,
			items: object.items.filter((_, index) => !removed.has(index)),
		};
	},
});

const registriesWith = (part?: ObjectPartKindDefinition<ListState>) => {
	const objectPartKind = createObjectPartKindRegistry();
	if (part !== undefined) {
		objectPartKind.register<ListState>("polyline", [part]);
	}
	return { objectPartKind };
};

/** The one field this seam's caller owns until a single part channel exists. */
const clearSelection = (state: CanvasControllerState): CanvasControllerState =>
	({ ...state, selectedVertex: null }) as CanvasControllerState;

describe("canDeleteObjectParts", () => {
	it("is true only where the type registers a deletion for that kind", () => {
		const state = makeState({ a: makeList("a", ["x", "y", "z"]) });

		expect(
			canDeleteObjectParts(state, targetOf(["0"]), registriesWith(itemPart(2))),
		).toBe(true);
	});

	it("is false for a kind whose definition declares no deletion", () => {
		const state = makeState({ a: makeList("a", ["x", "y"]) });
		const readOnly: ObjectPartKindDefinition<ListState> = {
			kind: "item",
			has: () => true,
		};

		expect(
			canDeleteObjectParts(state, targetOf(["0"]), registriesWith(readOnly)),
		).toBe(false);
	});

	it("is false when the object the target names is gone", () => {
		expect(
			canDeleteObjectParts(
				makeState({}),
				targetOf(["0"]),
				registriesWith(itemPart(2)),
			),
		).toBe(false);
	});
});

describe("deleteObjectParts", () => {
	it("removes the named parts and marks the edit as committed", () => {
		const state = makeState({ a: makeList("a", ["x", "y", "z"]) });

		const next = deleteObjectParts(
			state,
			targetOf(["1"]),
			registriesWith(itemPart(2)),
			clearSelection,
		);

		expect((next?.objects.a as ListState).items).toEqual(["x", "z"]);
		expect(next?.commitVersion).toBe(8);
		// A deletion is not something a duplicate can be offset from any more.
		expect(next?.lastDuplicate).toBeNull();
		expect(next?.selectedVertex).toBeNull();
	});

	it("removes several parts at once without the earlier index shifting the later", () => {
		const state = makeState({ a: makeList("a", ["x", "y", "z", "w"]) });

		const next = deleteObjectParts(
			state,
			targetOf(["0", "2"]),
			registriesWith(itemPart(1)),
			clearSelection,
		);

		expect((next?.objects.a as ListState).items).toEqual(["y", "w"]);
	});

	it("leaves the state untouched when the type refuses this one deletion", () => {
		const state = makeState({ a: makeList("a", ["x", "y"]) });

		const next = deleteObjectParts(
			state,
			targetOf(["0"]),
			registriesWith(itemPart(2)),
			clearSelection,
		);

		// The same object, not an equal one: callers skip further work on identity,
		// and the selection stays so the floor can be seen rather than guessed at.
		expect(next).toBe(state);
	});

	it("answers null — never a refusal — when the kind registers no deletion", () => {
		const state = makeState({ a: makeList("a", ["x", "y"]) });
		const readOnly: ObjectPartKindDefinition<ListState> = {
			kind: "item",
			has: () => true,
		};

		expect(
			deleteObjectParts(
				state,
				targetOf(["0"]),
				registriesWith(readOnly),
				clearSelection,
			),
		).toBeNull();
	});

	it("answers null for a target the object has outgrown", () => {
		const state = makeState({ a: makeList("a", ["x", "y"]) });

		expect(
			deleteObjectParts(
				state,
				targetOf(["5"]),
				registriesWith(itemPart(1)),
				clearSelection,
			),
		).toBeNull();
	});

	it("answers null when the object the target names is gone", () => {
		expect(
			deleteObjectParts(
				makeState({}),
				targetOf(["0"]),
				registriesWith(itemPart(1)),
				clearSelection,
			),
		).toBeNull();
	});

	it("leaves every other object as it was", () => {
		const other = makeList("b", ["p"]);
		const state = makeState({ a: makeList("a", ["x", "y", "z"]), b: other });

		const next = deleteObjectParts(
			state,
			targetOf(["0"]),
			registriesWith(itemPart(1)),
			clearSelection,
		);

		expect(next?.objects.b).toBe(other);
	});
});
