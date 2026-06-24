import { beforeAll, describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { initializeObjectRegistry } from "../../../setup/initializeObjectRegistry";
import { UngroupCommand } from "../UngroupCommand";

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

const makeGroup = (
	id: string,
	childIds: string[],
	parentId?: string,
): GroupState =>
	({
		id,
		type: "group",
		parentId,
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
		objectMenuOpenId: null,
		lastDuplicate: null,
		commitVersion: 0,
		...params,
	}) as unknown as CanvasControllerState;

describe("UngroupCommand", () => {
	it("ルートのグループを解体し子をルートへ昇格する", () => {
		const state = makeState({
			selectedIds: ["g"],
			objects: {
				g: makeGroup("g", ["a", "b"]),
				a: makeRect("a", 0, 0, "g"),
				b: makeRect("b", 200, 0, "g"),
			},
			rootIds: ["g"],
		});
		const next = UngroupCommand.execute(state);

		// グループは消える
		expect(next.objects["g"]).toBeUndefined();
		// 子は rootIds 上のグループ位置に展開される
		expect(next.rootIds).toEqual(["a", "b"]);
		// 子の parentId が解除される
		expect(next.objects["a"]?.parentId).toBeUndefined();
		expect(next.objects["b"]?.parentId).toBeUndefined();
		// 解体した子が選択される
		expect(next.selectedIds).toEqual(["a", "b"]);
		expect(next.commitVersion).toBe(1);
	});

	it("ネストしたグループは親グループの childIds 内で展開される", () => {
		const state = makeState({
			selectedIds: ["inner"],
			objects: {
				outer: makeGroup("outer", ["inner", "c"]),
				inner: makeGroup("inner", ["a", "b"], "outer"),
				a: makeRect("a", 0, 0, "inner"),
				b: makeRect("b", 50, 0, "inner"),
				c: makeRect("c", 200, 0, "outer"),
			},
			rootIds: ["outer"],
		});
		const next = UngroupCommand.execute(state);

		expect(next.objects["inner"]).toBeUndefined();
		// inner が outer.childIds の位置に展開される
		expect((next.objects["outer"] as GroupState).childIds).toEqual([
			"a",
			"b",
			"c",
		]);
		// 子は outer を親に持つ
		expect(next.objects["a"]?.parentId).toBe("outer");
		expect(next.objects["b"]?.parentId).toBe("outer");
		expect(next.rootIds).toEqual(["outer"]);
	});

	describe("canExecute", () => {
		it("選択がすべてグループなら実行可能", () => {
			const state = makeState({
				selectedIds: ["g"],
				objects: { g: makeGroup("g", ["a"]), a: makeRect("a", 0, 0, "g") },
				rootIds: ["g"],
			});
			expect(UngroupCommand.canExecute(state)).toBe(true);
		});

		it("グループ以外を含む選択は実行不可", () => {
			const state = makeState({
				selectedIds: ["g", "a"],
				objects: { g: makeGroup("g", []), a: makeRect("a", 0, 0) },
				rootIds: ["g", "a"],
			});
			expect(UngroupCommand.canExecute(state)).toBe(false);
		});

		it("選択が無ければ実行不可", () => {
			expect(
				UngroupCommand.canExecute(
					makeState({ selectedIds: [], objects: {}, rootIds: [] }),
				),
			).toBe(false);
		});
	});
});
