import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import type { ObjectPartKindDefinition } from "../ObjectPartKindRegistry";
import { createObjectPartKindRegistry } from "../ObjectPartKindRegistry";
import type { ObjectPartTarget } from "../resolveDeletableParts";
import { resolveDeletableParts } from "../resolveDeletableParts";

/** A shape carrying a list of parts addressed by their index, as a poly does. */
type ListState = ObjectState & { items: string[] };

const makeList = (id: string, items: string[]): ListState =>
	({ id, type: "polyline", items }) as unknown as ListState;

const makeState = (objects: Record<string, ObjectState>) =>
	({ objects }) as unknown as CanvasControllerState;

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

describe("resolveDeletableParts", () => {
	it("answers with the named object and the definition registered for the kind", () => {
		const object = makeList("a", ["x", "y", "z"]);
		const part = itemPart(2);

		const deletable = resolveDeletableParts(
			makeState({ a: object }),
			targetOf(["1"]),
			registriesWith(part),
		);

		// The same object and definition, not equal copies: the caller hands them
		// straight back to the type.
		expect(deletable?.object).toBe(object);
		expect(deletable?.part).toBe(part);
	});

	it("resolves a target the type will refuse, leaving the refusal to `delete`", () => {
		// The floor is the type's business; resolving only says whom to ask.
		const state = makeState({ a: makeList("a", ["x", "y"]) });

		expect(
			resolveDeletableParts(
				state,
				targetOf(["0"]),
				registriesWith(itemPart(2)),
			),
		).not.toBeNull();
	});

	it("answers null for a kind whose definition declares no deletion", () => {
		const readOnly: ObjectPartKindDefinition<ListState> = {
			kind: "item",
			has: () => true,
		};

		expect(
			resolveDeletableParts(
				makeState({ a: makeList("a", ["x", "y"]) }),
				targetOf(["0"]),
				registriesWith(readOnly),
			),
		).toBeNull();
	});

	it("answers null when the type registers nothing for that kind", () => {
		expect(
			resolveDeletableParts(
				makeState({ a: makeList("a", ["x", "y"]) }),
				targetOf(["0"]),
				registriesWith(),
			),
		).toBeNull();
	});

	it("answers null for a target the object has outgrown", () => {
		expect(
			resolveDeletableParts(
				makeState({ a: makeList("a", ["x", "y"]) }),
				targetOf(["5"]),
				registriesWith(itemPart(1)),
			),
		).toBeNull();
	});

	it("checks every id against `has`, not only the first", () => {
		// The `delete` contract promises all of them passed, so one stale id sinks
		// the whole target rather than being dropped from it.
		expect(
			resolveDeletableParts(
				makeState({ a: makeList("a", ["x", "y"]) }),
				targetOf(["0", "5"]),
				registriesWith(itemPart(1)),
			),
		).toBeNull();
	});

	it("answers null when the object the target names is gone", () => {
		expect(
			resolveDeletableParts(
				makeState({}),
				targetOf(["0"]),
				registriesWith(itemPart(1)),
			),
		).toBeNull();
	});
});
