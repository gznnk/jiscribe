import type {
	SelectionControlContext,
	SelectionControlEvent,
} from "@jiscribe/canvas";
import { describe, expect, it } from "vitest";

import type { ErEntityDoc } from "../../schema/ErEntityDoc";
import { erEntityToState } from "../../state/ErEntityMapper";
import type { ErEntityState } from "../../state/ErEntityState";
import { handleErEntityColumnGrip } from "../handleErEntityColumnGrip";

/** Five columns, none of them a primary key. */
const ENTITY = erEntityToState({
	id: "e-1",
	type: "erEntity",
	x: 0,
	y: 0,
	nameWidth: 96,
	typeWidth: 100,
	name: "users",
	columns: ["a", "b", "c", "d", "e"].map((name) => ({ name })),
} as ErEntityDoc);

/** Three columns whose last is the primary key, drawn where it is declared. */
const PRIMARY_KEY_LAST_ENTITY = erEntityToState({
	id: "e-2",
	type: "erEntity",
	x: 0,
	y: 0,
	nameWidth: 96,
	typeWidth: 100,
	name: "orders",
	columns: [{ name: "a" }, { name: "b" }, { key: "PK", name: "id" }],
} as ErEntityDoc);

/** The entity with `ranges` of `kind` standing on it; no ranges for no pick. */
const contextWith = (
	ranges: readonly (readonly [string, string])[],
	kind = "erEntityColumn",
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
	result: ReturnType<typeof handleErEntityColumnGrip>,
): (readonly [string, string])[] | null | undefined => {
	const selection = result?.selection;
	if (selection === undefined || selection === null) {
		return selection;
	}
	return selection.ranges.map((range) => [range.anchorId, range.focusId]);
};

describe("handleErEntityColumnGrip", () => {
	it("picks the one column, replacing a pick of several", () => {
		expect(handleErEntityColumnGrip(contextWith([]), clickOn("col:1"))).toEqual(
			{
				selection: {
					kind: "erEntityColumn",
					ranges: [{ anchorId: "col:1", focusId: "col:1" }],
				},
			},
		);
		expect(
			writtenRanges(
				handleErEntityColumnGrip(
					contextWith([
						["col:0", "col:2"],
						["col:4", "col:4"],
					]),
					clickOn("col:3"),
				),
			),
		).toEqual([["col:3", "col:3"]]);
	});

	it("drops a column the entity does not have, and every gesture but the click", () => {
		expect(
			handleErEntityColumnGrip(contextWith([]), clickOn("col:5")),
		).toBeNull();
		expect(
			handleErEntityColumnGrip(contextWith([]), clickOn(undefined)),
		).toBeNull();
		expect(
			handleErEntityColumnGrip(contextWith([]), {
				...clickOn("col:0"),
				type: "doubleClick",
			}),
		).toBeNull();
	});

	describe("Shift-click", () => {
		it("moves the active range's focus, keeping its anchor and the earlier ranges", () => {
			expect(
				writtenRanges(
					handleErEntityColumnGrip(
						contextWith([
							["col:0", "col:0"],
							["col:2", "col:2"],
						]),
						clickOn("col:4", { shift: true }),
					),
				),
			).toEqual([
				["col:0", "col:0"],
				["col:2", "col:4"],
			]);
			expect(
				writtenRanges(
					handleErEntityColumnGrip(
						contextWith([["col:2", "col:4"]]),
						clickOn("col:0", { shift: true }),
					),
				),
			).toEqual([["col:2", "col:0"]]);
		});

		it("changes nothing when the focus already is the column", () => {
			expect(
				handleErEntityColumnGrip(
					contextWith([["col:1", "col:3"]]),
					clickOn("col:3", { shift: true }),
				),
			).toBeNull();
		});

		it("is a plain click over no pick or a slot pick", () => {
			expect(
				writtenRanges(
					handleErEntityColumnGrip(
						contextWith([]),
						clickOn("col:2", { shift: true }),
					),
				),
			).toEqual([["col:2", "col:2"]]);
			const slotPick = handleErEntityColumnGrip(
				contextWith([["col:0:name", "col:0:name"]], "textSlot"),
				clickOn("col:2", { shift: true }),
			);
			expect(slotPick?.selection?.kind).toBe("erEntityColumn");
			expect(writtenRanges(slotPick)).toEqual([["col:2", "col:2"]]);
		});
	});

	describe("Ctrl / Meta-click", () => {
		it("adds a column no range covers as a range of its own, last", () => {
			for (const mods of [{ ctrl: true }, { meta: true }]) {
				expect(
					writtenRanges(
						handleErEntityColumnGrip(
							contextWith([["col:0", "col:1"]]),
							clickOn("col:3", mods),
						),
					),
				).toEqual([
					["col:0", "col:1"],
					["col:3", "col:3"],
				]);
			}
		});

		it("takes a column out of a range, splitting it in the range's direction", () => {
			expect(
				writtenRanges(
					handleErEntityColumnGrip(
						contextWith([["col:0", "col:4"]]),
						clickOn("col:2", { ctrl: true }),
					),
				),
			).toEqual([
				["col:0", "col:1"],
				["col:3", "col:4"],
			]);
			expect(
				writtenRanges(
					handleErEntityColumnGrip(
						contextWith([["col:4", "col:0"]]),
						clickOn("col:0", { meta: true }),
					),
				),
			).toEqual([["col:4", "col:1"]]);
		});

		it("splits a range by the declared order, a PK column included", () => {
			expect(
				writtenRanges(
					handleErEntityColumnGrip(
						contextWith(
							[["col:2", "col:0"]],
							"erEntityColumn",
							PRIMARY_KEY_LAST_ENTITY,
						),
						clickOn("col:1", { ctrl: true }),
					),
				),
			).toEqual([
				["col:2", "col:2"],
				["col:0", "col:0"],
			]);
		});

		it("clears the pick when the last picked column is taken out", () => {
			const result = handleErEntityColumnGrip(
				contextWith([["col:2", "col:2"]]),
				clickOn("col:2", { ctrl: true }),
			);
			expect(result).toEqual({ selection: null });
		});

		it("is a plain click over no pick or a slot pick", () => {
			expect(
				writtenRanges(
					handleErEntityColumnGrip(
						contextWith([]),
						clickOn("col:2", { ctrl: true }),
					),
				),
			).toEqual([["col:2", "col:2"]]);
			expect(
				writtenRanges(
					handleErEntityColumnGrip(
						contextWith([["col:2:name", "col:2:name"]], "textSlot"),
						clickOn("col:2", { ctrl: true }),
					),
				),
			).toEqual([["col:2", "col:2"]]);
		});
	});
});
