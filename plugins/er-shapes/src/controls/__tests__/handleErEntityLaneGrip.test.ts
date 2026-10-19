import type {
	SelectionControlContext,
	SelectionControlEvent,
} from "@jiscribe/canvas";
import { describe, expect, it } from "vitest";

import type { ErEntityDoc } from "../../schema/ErEntityDoc";
import { erEntityToState } from "../../state/ErEntityMapper";
import type { ErEntityState } from "../../state/ErEntityState";
import { handleErEntityLaneGrip } from "../handleErEntityLaneGrip";

const makeState = (columns: ErEntityDoc["columns"]): ErEntityState =>
	erEntityToState({
		id: "e-1",
		type: "erEntity",
		x: 0,
		y: 0,
		nameWidth: 96,
		typeWidth: 100,
		name: "users",
		columns,
	} as ErEntityDoc);

const ENTITY = makeState([{ name: "id" }, { name: "email" }]);

/** The entity with `ranges` of `kind` standing on it; no ranges for no pick. */
const contextWith = (
	ranges: readonly (readonly [string, string])[],
	kind = "erEntityLane",
	entity: ErEntityState = ENTITY,
): SelectionControlContext<ErEntityState> => ({
	object: entity,
	startObject: entity,
	selectedPart:
		ranges.length === 0
			? null
			: {
					kind,
					ranges: ranges.map(([anchorId, focusId]) => ({ anchorId, focusId })),
				},
});

const MODS = { shift: false, alt: false, ctrl: false, meta: false };

const clickOn = (
	subAction: string | undefined,
	mods: Partial<typeof MODS> = {},
): SelectionControlEvent => ({
	type: "click",
	last: { x: 0, y: 0 },
	mods: { ...MODS, ...mods },
	subAction,
});

/** The selection a handler result writes, as `[anchorId, focusId]` pairs. */
const writtenRanges = (
	result: ReturnType<typeof handleErEntityLaneGrip>,
): (readonly [string, string])[] | null | undefined => {
	const selection = result?.selection;
	if (selection === undefined || selection === null) {
		return selection;
	}
	return selection.ranges.map((range) => [range.anchorId, range.focusId]);
};

describe("handleErEntityLaneGrip", () => {
	it("picks the clicked lane as a lane part", () => {
		expect(handleErEntityLaneGrip(contextWith([]), clickOn("type"))).toEqual({
			selection: {
				kind: "erEntityLane",
				ranges: [{ anchorId: "type", focusId: "type" }],
			},
		});
	});

	it("ignores anything but a lane the entity has", () => {
		expect(
			handleErEntityLaneGrip(contextWith([]), clickOn("col:0")),
		).toBeNull();
		expect(
			handleErEntityLaneGrip(contextWith([]), clickOn(undefined)),
		).toBeNull();
		expect(
			handleErEntityLaneGrip(
				contextWith([], "erEntityLane", makeState([])),
				clickOn("name"),
			),
		).toBeNull();
	});

	it("runs a Shift-click from the active range's anchor to the clicked lane", () => {
		expect(
			writtenRanges(
				handleErEntityLaneGrip(
					contextWith([["key", "key"]]),
					clickOn("type", { shift: true }),
				),
			),
		).toEqual([["key", "type"]]);
	});

	it("adds a lane with Ctrl and takes it back out, the last one clearing the pick", () => {
		expect(
			writtenRanges(
				handleErEntityLaneGrip(
					contextWith([["key", "key"]]),
					clickOn("type", { ctrl: true }),
				),
			),
		).toEqual([
			["key", "key"],
			["type", "type"],
		]);
		expect(
			writtenRanges(
				handleErEntityLaneGrip(
					contextWith([["key", "type"]]),
					clickOn("name", { meta: true }),
				),
			),
		).toEqual([
			["key", "key"],
			["type", "type"],
		]);
		expect(
			handleErEntityLaneGrip(
				contextWith([["name", "name"]]),
				clickOn("name", { ctrl: true }),
			),
		).toEqual({ selection: null });
	});

	it("reads a modified click over a pick of another kind as a plain one", () => {
		expect(
			writtenRanges(
				handleErEntityLaneGrip(
					contextWith([["col:0", "col:0"]], "erEntityColumn"),
					clickOn("name", { shift: true }),
				),
			),
		).toEqual([["name", "name"]]);
	});
});
