import { beforeAll, describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { initializeObjectRegistry } from "../../../setup/initializeObjectRegistry";
import { DuplicateCommand } from "../DuplicateCommand";

// cloneObjects が objectBehaviorRegistry（moveByDelta）を使うため初期化する
beforeAll(() => {
	initializeObjectRegistry();
});

const makeRect = (
	id: string,
	cx: number,
	cy: number,
	parentId?: string,
): ObjectState =>
	({
		id,
		type: "rect",
		parentId,
		cx,
		cy,
		width: 100,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as ObjectState;

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
}): CanvasControllerState =>
	({
		multiSelectGroup: null,
		lastDuplicate: null,
		commitVersion: 0,
		...params,
	}) as unknown as CanvasControllerState;

describe("DuplicateCommand", () => {
	it("ルート選択を既定オフセット(+20,+20)で複製し前面へ積む", () => {
		const state = makeState({
			selectedIds: ["a"],
			objects: { a: makeRect("a", 100, 100) },
			rootIds: ["a"],
		});
		const next = DuplicateCommand.execute(state);

		expect(Object.keys(next.objects)).toHaveLength(2);
		expect(next.rootIds).toHaveLength(2);
		// 元 a はそのまま残り、新 ID が末尾（最前面）
		expect(next.rootIds[0]).toBe("a");
		const newId = next.rootIds[1];
		expect(newId).not.toBe("a");

		const cloned = next.objects[newId] as unknown as { cx: number; cy: number };
		expect(cloned.cx).toBe(120);
		expect(cloned.cy).toBe(120);
	});

	it("複製物を選択状態にし lastDuplicate を記録する", () => {
		const state = makeState({
			selectedIds: ["a"],
			objects: { a: makeRect("a", 100, 100) },
			rootIds: ["a"],
		});
		const next = DuplicateCommand.execute(state);
		expect(next.selectedIds).toEqual([next.rootIds[1]]);
		expect(next.lastDuplicate?.newIds).toEqual(next.selectedIds);
		expect(next.lastDuplicate?.offset).toEqual({ x: 20, y: 20 });
		expect(next.commitVersion).toBe(1);
	});

	it("グループ内選択は同じ親グループ内に複製する", () => {
		const state = makeState({
			selectedIds: ["c1"],
			objects: {
				g: makeGroup("g", ["c1", "c2"]),
				c1: makeRect("c1", 50, 50, "g"),
				c2: makeRect("c2", 80, 80, "g"),
			},
			rootIds: ["g"],
		});
		const next = DuplicateCommand.execute(state);
		const newId = next.selectedIds[0];
		// 新オブジェクトの親はグループ g
		expect(next.objects[newId]?.parentId).toBe("g");
		// 親グループの childIds に追加されている
		expect((next.objects["g"] as GroupState).childIds).toContain(newId);
		// rootIds は g のまま（グループ内複製はトップレベルに出さない）
		expect(next.rootIds).toEqual(["g"]);
	});

	describe("canExecute", () => {
		it("選択があれば実行可能", () => {
			const state = makeState({
				selectedIds: ["a"],
				objects: { a: makeRect("a", 0, 0) },
				rootIds: ["a"],
			});
			expect(DuplicateCommand.canExecute(state)).toBe(true);
		});

		it("選択が無ければ実行不可", () => {
			expect(
				DuplicateCommand.canExecute(
					makeState({ selectedIds: [], objects: {}, rootIds: [] }),
				),
			).toBe(false);
		});
	});
});
