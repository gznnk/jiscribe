import { beforeAll, describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import type { PolylineState } from "../../../../states/objects/primitives/polyline/PolylineState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { initializeObjectRegistry } from "../../../setup/initializeObjectRegistry";
import { DeleteCommand } from "../DeleteCommand";

// グループのバウンド再計算が objectBehaviorRegistry 経由になるため初期化する
beforeAll(() => {
	initializeObjectRegistry();
});

const makeRect = (id: string, parentId?: string): ObjectState =>
	({
		id,
		type: "rect",
		parentId,
		cx: 0,
		cy: 0,
		width: 100,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as ObjectState;

const makePolyline = (
	id: string,
	points: { x: number; y: number }[],
): PolylineState =>
	({ id, type: "polyline", points }) as unknown as PolylineState;

const makeGroup = (id: string, childIds: string[]): GroupState =>
	({
		id,
		type: "group",
		childIds,
		cx: 0,
		cy: 0,
		width: 100,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as GroupState;

const makeState = (params: {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
	rootIds: string[];
	selectedVertex?: CanvasControllerState["selectedVertex"];
	selectedConnectorId?: string | null;
}): CanvasControllerState =>
	({
		selectedVertex: null,
		selectedConnectorId: null,
		objectMenuOpenId: null,
		lastDuplicate: null,
		commitVersion: 0,
		...params,
	}) as unknown as CanvasControllerState;

describe("DeleteCommand", () => {
	describe("オブジェクト削除", () => {
		it("選択オブジェクトを objects と rootIds から除去し選択を解除する", () => {
			const state = makeState({
				selectedIds: ["b"],
				objects: { a: makeRect("a"), b: makeRect("b") },
				rootIds: ["a", "b"],
			});
			const next = DeleteCommand.execute(state);
			expect(next.objects["b"]).toBeUndefined();
			expect(next.rootIds).toEqual(["a"]);
			expect(next.selectedIds).toEqual([]);
			expect(next.commitVersion).toBe(1);
		});

		it("グループ選択時は子孫も再帰的に削除する", () => {
			const state = makeState({
				selectedIds: ["g"],
				objects: {
					g: makeGroup("g", ["c1", "c2"]),
					c1: makeRect("c1", "g"),
					c2: makeRect("c2", "g"),
				},
				rootIds: ["g"],
			});
			const next = DeleteCommand.execute(state);
			expect(next.objects["g"]).toBeUndefined();
			expect(next.objects["c1"]).toBeUndefined();
			expect(next.objects["c2"]).toBeUndefined();
			expect(next.rootIds).toEqual([]);
		});

		it("グループ内の 1 子を削除すると親 childIds から外れる", () => {
			// 残り 2 子なのでグループは解体されない
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
			const next = DeleteCommand.execute(state);
			expect(next.objects["c1"]).toBeUndefined();
			expect((next.objects["g"] as GroupState).childIds).toEqual(["c2", "c3"]);
		});
	});

	describe("頂点削除", () => {
		it("最小頂点数を超えるポリラインは指定頂点を削除する", () => {
			const poly = makePolyline("p", [
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
				{ x: 20, y: 0 },
			]);
			const state = makeState({
				selectedIds: ["p"],
				objects: { p: poly },
				rootIds: ["p"],
				selectedVertex: { objectId: "p", vertexIndex: 1 },
			});
			const next = DeleteCommand.execute(state);
			const updated = next.objects["p"] as PolylineState;
			expect(updated.points).toEqual([
				{ x: 0, y: 0 },
				{ x: 20, y: 0 },
			]);
			expect(next.selectedVertex).toBeNull();
			// オブジェクト自体は残る（頂点削除が優先される）
			expect(next.objects["p"]).toBeDefined();
		});

		it("最小頂点数（polyline は 2）では頂点を削除せず state を据え置く", () => {
			const poly = makePolyline("p", [
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
			]);
			const state = makeState({
				selectedIds: ["p"],
				objects: { p: poly },
				rootIds: ["p"],
				selectedVertex: { objectId: "p", vertexIndex: 1 },
			});
			expect(DeleteCommand.execute(state)).toBe(state);
		});

		it("頂点選択対象が poly でない場合は selectedVertex のみ解除する", () => {
			const state = makeState({
				selectedIds: ["r"],
				objects: { r: makeRect("r") },
				rootIds: ["r"],
				selectedVertex: { objectId: "r", vertexIndex: 0 },
			});
			const next = DeleteCommand.execute(state);
			expect(next.selectedVertex).toBeNull();
			// オブジェクト削除には落ちない
			expect(next.objects["r"]).toBeDefined();
		});
	});

	describe("canExecute", () => {
		it("オブジェクト選択があれば実行可能", () => {
			const state = makeState({
				selectedIds: ["a"],
				objects: { a: makeRect("a") },
				rootIds: ["a"],
			});
			expect(DeleteCommand.canExecute(state)).toBe(true);
		});

		it("頂点選択があれば実行可能", () => {
			const state = makeState({
				selectedIds: [],
				objects: {},
				rootIds: [],
				selectedVertex: { objectId: "p", vertexIndex: 0 },
			});
			expect(DeleteCommand.canExecute(state)).toBe(true);
		});

		it("コネクター選択があれば実行可能", () => {
			const state = makeState({
				selectedIds: [],
				objects: {},
				rootIds: [],
				selectedConnectorId: "c1",
			});
			expect(DeleteCommand.canExecute(state)).toBe(true);
		});

		it("何も選択していなければ実行不可", () => {
			expect(
				DeleteCommand.canExecute(
					makeState({ selectedIds: [], objects: {}, rootIds: [] }),
				),
			).toBe(false);
		});
	});
});
