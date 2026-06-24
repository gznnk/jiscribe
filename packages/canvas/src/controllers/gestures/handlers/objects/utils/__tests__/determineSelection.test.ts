import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import type { Mods } from "../../../../registry/ObjectBehaviorTypes";
import { determineSelection } from "../determineSelection";

const rectObj = (id: string, parentId?: string): ObjectState =>
	({ id, type: "rect", parentId }) as unknown as ObjectState;

const groupObj = (
	id: string,
	childIds: string[],
	parentId?: string,
): ObjectState =>
	({ id, type: "group", childIds, parentId }) as unknown as ObjectState;

const makeState = (
	selectedIds: string[],
	objects: Record<string, ObjectState>,
): CanvasControllerState =>
	({
		selectedIds,
		selectedConnectorId: null,
		objects,
	}) as unknown as CanvasControllerState;

const noMods: Mods = { ctrl: false, meta: false, shift: false, alt: false };
const ctrlMods: Mods = { ctrl: true, meta: false, shift: false, alt: false };

// 共通のオブジェクトセット
// root-rect: ルートレベルの矩形
// group1: rect1, rect2 を含むグループ
// group2: group1 を含むネストグループ
const baseObjects = {
	"root-rect": rectObj("root-rect"),
	group1: groupObj("group1", ["rect1", "rect2"]),
	rect1: rectObj("rect1", "group1"),
	rect2: rectObj("rect2", "group1"),
	group2: groupObj("group2", ["group1"]),
};

const nestedObjects = {
	...baseObjects,
	group1: groupObj("group1", ["rect1", "rect2"], "group2"),
};

describe("determineSelection", () => {
	describe("ルートレベルのオブジェクト（非グループ）", () => {
		it("未選択のとき [id] を返す", () => {
			const state = makeState([], baseObjects);
			const result = determineSelection(rectObj("root-rect"), state, noMods);
			expect(result).toEqual(["root-rect"]);
		});

		it("すでに選択済みで Ctrl なしのとき null を返す（変更なし）", () => {
			const state = makeState(["root-rect"], baseObjects);
			const result = determineSelection(rectObj("root-rect"), state, noMods);
			expect(result).toBeNull();
		});

		it("すでに選択済みで Ctrl ありのとき選択解除（[]）を返す", () => {
			const state = makeState(["root-rect"], baseObjects);
			const result = determineSelection(rectObj("root-rect"), state, ctrlMods);
			expect(result).toEqual([]);
		});

		it("未選択で Ctrl あり・他に選択中アイテムがあるとき追加選択する", () => {
			const state = makeState(["root-rect"], {
				"root-rect": rectObj("root-rect"),
				"other-rect": rectObj("other-rect"),
			});
			const result = determineSelection(rectObj("other-rect"), state, ctrlMods);
			expect(result).not.toBeNull();
			expect(result).toContain("root-rect");
			expect(result).toContain("other-rect");
		});
	});

	describe("グループ内のオブジェクト", () => {
		it("祖先が未選択・他の選択なし → 最上位グループを選択する", () => {
			const state = makeState([], nestedObjects);
			const result = determineSelection(
				rectObj("rect1", "group1"),
				state,
				noMods,
			);
			expect(result).toEqual(["group2"]);
		});

		it("直近の親グループが選択済み・子は未選択 → 子を選択する", () => {
			const state = makeState(["group1"], baseObjects);
			const result = determineSelection(
				rectObj("rect1", "group1"),
				state,
				noMods,
			);
			expect(result).toEqual(["rect1"]);
		});

		it("直近の親グループが選択済み・子はすでに選択済み → null（変更なし）", () => {
			const state = makeState(["group1", "rect1"], baseObjects);
			const result = determineSelection(
				rectObj("rect1", "group1"),
				state,
				noMods,
			);
			expect(result).toBeNull();
		});

		it("兄弟が選択済みのとき自分も同レベルで選択する", () => {
			const state = makeState(["rect1"], baseObjects);
			const result = determineSelection(
				rectObj("rect2", "group1"),
				state,
				noMods,
			);
			expect(result).not.toBeNull();
			expect(result).toContain("rect2");
		});
	});

	describe("共通祖先（hasSelectedDescendants 経由）", () => {
		// group-top
		//   ├ group-a ─ rect-a
		//   └ group-b ─ rect-b
		// rect-b を選択した状態で rect-a をクリックすると、共通祖先 group-top の
		// 別サブツリーに選択中アイテムがあるため、rect-a と同階層の group-a に揃える。
		const commonAncestorObjects: Record<string, ObjectState> = {
			"group-top": groupObj("group-top", ["group-a", "group-b"]),
			"group-a": groupObj("group-a", ["rect-a"], "group-top"),
			"group-b": groupObj("group-b", ["rect-b"], "group-top"),
			"rect-a": rectObj("rect-a", "group-a"),
			"rect-b": rectObj("rect-b", "group-b"),
		};

		it("別サブツリーの子孫が選択済みのとき共通祖先の一段下を選択する", () => {
			const state = makeState(["rect-b"], commonAncestorObjects);
			const result = determineSelection(
				rectObj("rect-a", "group-a"),
				state,
				noMods,
			);
			expect(result).toEqual(["group-a"]);
		});

		it("どのサブツリーにも選択中アイテムがないとき最上位祖先を選択する", () => {
			const state = makeState(["root-rect"], {
				...commonAncestorObjects,
				"root-rect": rectObj("root-rect"),
			});
			const result = determineSelection(
				rectObj("rect-a", "group-a"),
				state,
				noMods,
			);
			expect(result).toEqual(["group-top"]);
		});
	});

	describe("autoSelectParentGroups の統合", () => {
		it("グループの全子が選択されると親グループが選択される", () => {
			const state = makeState(["rect1"], baseObjects);
			// rect2 を Ctrl で追加選択 → rect1 + rect2 で group1 の全子が揃う → group1 に昇格
			const result = determineSelection(
				rectObj("rect2", "group1"),
				state,
				ctrlMods,
			);
			expect(result).not.toBeNull();
			expect(result).toContain("group1");
			expect(result).not.toContain("rect1");
			expect(result).not.toContain("rect2");
		});
	});
});
