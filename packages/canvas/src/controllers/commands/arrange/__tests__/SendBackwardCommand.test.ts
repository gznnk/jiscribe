import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { SendBackwardCommand } from "../SendBackwardCommand";

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

describe("SendBackwardCommand", () => {
	describe("ルート直下の選択", () => {
		it("単一選択を 1 つ背面へ（隣と入れ替え）移動する", () => {
			const state = makeState({
				selectedIds: ["c"],
				objects: { a: makeRect("a"), b: makeRect("b"), c: makeRect("c") },
				rootIds: ["a", "b", "c"],
			});
			expect(SendBackwardCommand.execute(state).rootIds).toEqual([
				"a",
				"c",
				"b",
			]);
		});

		it("最背面の要素は移動しない", () => {
			const state = makeState({
				selectedIds: ["a"],
				objects: { a: makeRect("a"), b: makeRect("b"), c: makeRect("c") },
				rootIds: ["a", "b", "c"],
			});
			expect(SendBackwardCommand.execute(state).rootIds).toEqual([
				"a",
				"b",
				"c",
			]);
		});

		it("連続する選択ブロックは塊として 1 つ後退する", () => {
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
			expect(SendBackwardCommand.execute(state).rootIds).toEqual([
				"b",
				"c",
				"a",
				"d",
			]);
		});

		it("commitVersion を増分する", () => {
			const state = makeState({
				selectedIds: ["b"],
				objects: { a: makeRect("a"), b: makeRect("b") },
				rootIds: ["a", "b"],
			});
			expect(SendBackwardCommand.execute(state).commitVersion).toBe(1);
		});
	});

	describe("同一グループ内の選択", () => {
		it("childIds 内で 1 つ背面へ移動し rootIds は変えない", () => {
			const state = makeState({
				selectedIds: ["c3"],
				objects: {
					g: makeGroup("g", ["c1", "c2", "c3"]),
					c1: makeRect("c1", "g"),
					c2: makeRect("c2", "g"),
					c3: makeRect("c3", "g"),
				},
				rootIds: ["g"],
			});
			const next = SendBackwardCommand.execute(state);
			expect((next.objects["g"] as GroupState).childIds).toEqual([
				"c1",
				"c3",
				"c2",
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
			expect(SendBackwardCommand.canExecute(state)).toBe(true);
		});

		it("選択が無ければ実行不可", () => {
			expect(
				SendBackwardCommand.canExecute(
					makeState({ selectedIds: [], objects: {}, rootIds: [] }),
				),
			).toBe(false);
		});
	});
});
