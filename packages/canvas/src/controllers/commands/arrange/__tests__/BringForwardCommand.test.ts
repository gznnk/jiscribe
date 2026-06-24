import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { BringForwardCommand } from "../BringForwardCommand";

const makeState = (params: {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
	rootIds: string[];
	selectedConnectorId?: string | null;
}): CanvasControllerState =>
	({
		selectedConnectorId: null,
		...params,
		commitVersion: 0,
	}) as unknown as CanvasControllerState;

const makeRect = (id: string, parentId?: string): ObjectState =>
	({ id, type: "rect", parentId }) as ObjectState;

const makeGroup = (id: string, childIds: string[]): GroupState =>
	({ id, type: "group", parentId: undefined, childIds }) as GroupState;

describe("BringForwardCommand", () => {
	describe("ルート直下の選択", () => {
		it("単一選択を 1 つ前面へ（隣と入れ替え）移動する", () => {
			const state = makeState({
				selectedIds: ["a"],
				objects: { a: makeRect("a"), b: makeRect("b"), c: makeRect("c") },
				rootIds: ["a", "b", "c"],
			});
			expect(BringForwardCommand.execute(state).rootIds).toEqual([
				"b",
				"a",
				"c",
			]);
		});

		it("最前面の要素は移動しない", () => {
			const state = makeState({
				selectedIds: ["c"],
				objects: { a: makeRect("a"), b: makeRect("b"), c: makeRect("c") },
				rootIds: ["a", "b", "c"],
			});
			expect(BringForwardCommand.execute(state).rootIds).toEqual([
				"a",
				"b",
				"c",
			]);
		});

		it("連続する選択ブロックは塊として 1 つ前進する", () => {
			const state = makeState({
				selectedIds: ["b", "c"],
				objects: {
					a: makeRect("a"),
					b: makeRect("b"),
					c: makeRect("c"),
					d: makeRect("d"),
				},
				rootIds: ["a", "b", "c", "d"],
			});
			// b,c の塊が d の前面側へ。隣接 selected 同士は入れ替えない
			expect(BringForwardCommand.execute(state).rootIds).toEqual([
				"a",
				"d",
				"b",
				"c",
			]);
		});

		it("commitVersion を増分する", () => {
			const state = makeState({
				selectedIds: ["a"],
				objects: { a: makeRect("a"), b: makeRect("b") },
				rootIds: ["a", "b"],
			});
			expect(BringForwardCommand.execute(state).commitVersion).toBe(1);
		});
	});

	describe("同一グループ内の選択", () => {
		it("childIds 内で 1 つ前面へ移動し rootIds は変えない", () => {
			const state = makeState({
				selectedIds: ["c1"],
				objects: {
					g: makeGroup("g", ["c1", "c2", "c3"]),
					c1: makeRect("c1", "g"),
					c2: makeRect("c2", "g"),
					c3: makeRect("c3", "g"),
				},
				rootIds: ["g"],
			});
			const next = BringForwardCommand.execute(state);
			expect((next.objects["g"] as GroupState).childIds).toEqual([
				"c2",
				"c1",
				"c3",
			]);
			expect(next.rootIds).toEqual(["g"]);
		});
	});

	describe("canExecute", () => {
		it("同一親に属する選択は実行可能", () => {
			const state = makeState({
				selectedIds: ["a", "b"],
				objects: { a: makeRect("a"), b: makeRect("b") },
				rootIds: ["a", "b"],
			});
			expect(BringForwardCommand.canExecute(state)).toBe(true);
		});

		it("選択が無ければ実行不可", () => {
			expect(
				BringForwardCommand.canExecute(
					makeState({ selectedIds: [], objects: {}, rootIds: [] }),
				),
			).toBe(false);
		});

		it("親が異なる混在選択は実行不可", () => {
			const state = makeState({
				selectedIds: ["a", "c1"],
				objects: {
					a: makeRect("a"),
					g: makeGroup("g", ["c1"]),
					c1: makeRect("c1", "g"),
				},
				rootIds: ["a", "g"],
			});
			expect(BringForwardCommand.canExecute(state)).toBe(false);
		});
	});
});
