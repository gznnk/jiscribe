import { beforeAll, describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { initializeObjectRegistry } from "../../../setup/initializeObjectRegistry";
import { moveCommands } from "../MoveCommands";

// moveByDelta は objectBehaviorRegistry 経由で解決されるため、レジストリを初期化する
beforeAll(() => {
	initializeObjectRegistry();
});

const commandById = (id: string) => {
	const command = moveCommands.find((c) => c.id === id);
	if (!command) {
		throw new Error(`command not found: ${id}`);
	}
	return command;
};

const makeRect = (id: string, cx: number, cy: number): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width: 10,
		height: 10,
	}) as unknown as ObjectState;

const makeState = (params: {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
	multiSelectGroup?: GroupState | null;
	textEditState?: CanvasControllerState["textEditState"];
}): CanvasControllerState =>
	({
		selectedIds: params.selectedIds,
		objects: params.objects,
		multiSelectGroup: params.multiSelectGroup ?? null,
		textEditState: params.textEditState ?? null,
		commitVersion: 0,
		historyCoalesce: { recorded: null, pending: null },
	}) as unknown as CanvasControllerState;

describe("moveCommands", () => {
	it("上下左右 × 通常/Shift の 8 コマンドを生成する", () => {
		expect(moveCommands.map((c) => c.id).sort()).toEqual(
			[
				"move-down",
				"move-down-large",
				"move-left",
				"move-left-large",
				"move-right",
				"move-right-large",
				"move-up",
				"move-up-large",
			].sort(),
		);
	});

	it("全コマンドが execute で選択 ID を含む集約キー（pending）を立てる（対象が変われば別操作）", () => {
		const stateA = makeState({
			selectedIds: ["a"],
			objects: { a: makeRect("a", 0, 0) },
		});
		const stateAB = makeState({
			selectedIds: ["a", "b"],
			objects: { a: makeRect("a", 0, 0), b: makeRect("b", 0, 0) },
		});
		for (const command of moveCommands) {
			expect(command.execute(stateA).historyCoalesce.pending).toBe("move:a");
			expect(command.execute(stateAB).historyCoalesce.pending).toBe("move:a,b");
		}
	});

	describe("ショートカット", () => {
		it("通常コマンドは shift なしの矢印キーにバインドされる", () => {
			expect(commandById("move-up").shortcuts?.default).toEqual([
				{ code: "ArrowUp", shift: false },
			]);
		});

		it("Shift コマンドは shift ありの矢印キーにバインドされる", () => {
			expect(commandById("move-right-large").shortcuts?.default).toEqual([
				{ code: "ArrowRight", shift: true },
			]);
		});
	});

	describe("execute（移動量）", () => {
		it("move-right は cx を +1 する（画面座標）", () => {
			const state = makeState({
				selectedIds: ["a"],
				objects: { a: makeRect("a", 50, 50) },
			});
			const next = commandById("move-right").execute(state);
			const rect = next.objects["a"] as unknown as { cx: number; cy: number };
			expect(rect.cx).toBe(51);
			expect(rect.cy).toBe(50);
		});

		it("move-up は cy を -1 する（画面座標では上が負）", () => {
			const state = makeState({
				selectedIds: ["a"],
				objects: { a: makeRect("a", 50, 50) },
			});
			const next = commandById("move-up").execute(state);
			const rect = next.objects["a"] as unknown as { cx: number; cy: number };
			expect(rect.cy).toBe(49);
		});

		it("Shift コマンドは 10px 移動する", () => {
			const state = makeState({
				selectedIds: ["a"],
				objects: { a: makeRect("a", 50, 50) },
			});
			const next = commandById("move-down-large").execute(state);
			const rect = next.objects["a"] as unknown as { cx: number; cy: number };
			expect(rect.cy).toBe(60);
		});

		it("複数選択をまとめて同じ delta で移動する", () => {
			const state = makeState({
				selectedIds: ["a", "b"],
				objects: { a: makeRect("a", 0, 0), b: makeRect("b", 100, 100) },
			});
			const next = commandById("move-left").execute(state);
			expect((next.objects["a"] as unknown as { cx: number }).cx).toBe(-1);
			expect((next.objects["b"] as unknown as { cx: number }).cx).toBe(99);
		});

		it("multiSelectGroup の中心も同期して移動する", () => {
			const multiSelectGroup = {
				id: "ms",
				type: "group",
				cx: 50,
				cy: 50,
			} as unknown as GroupState;
			const state = makeState({
				selectedIds: ["a", "b"],
				objects: { a: makeRect("a", 0, 0), b: makeRect("b", 100, 100) },
				multiSelectGroup,
			});
			const next = commandById("move-right").execute(state);
			expect(next.multiSelectGroup?.cx).toBe(51);
			expect(next.multiSelectGroup?.cy).toBe(50);
		});

		it("commitVersion を増分する", () => {
			const state = makeState({
				selectedIds: ["a"],
				objects: { a: makeRect("a", 0, 0) },
			});
			const next = commandById("move-up").execute(state);
			expect(next.commitVersion).toBe(state.commitVersion + 1);
		});
	});

	describe("canExecute", () => {
		it("選択がある通常時は実行可能", () => {
			const state = makeState({
				selectedIds: ["a"],
				objects: { a: makeRect("a", 0, 0) },
			});
			expect(commandById("move-up").canExecute(state)).toBe(true);
		});

		it("選択がない場合は実行不可", () => {
			const state = makeState({ selectedIds: [], objects: {} });
			expect(commandById("move-up").canExecute(state)).toBe(false);
		});

		it("テキスト編集中はキャレット移動を優先して実行不可", () => {
			const state = makeState({
				selectedIds: ["a"],
				objects: { a: makeRect("a", 0, 0) },
				textEditState: { objectId: "a", text: "" },
			});
			expect(commandById("move-up").canExecute(state)).toBe(false);
		});
	});
});
