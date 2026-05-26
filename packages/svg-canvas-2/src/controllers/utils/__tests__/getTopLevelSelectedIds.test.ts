import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import type { RectState } from "../../../states/objects/primitives/rect/RectState";
import { getTopLevelSelectedIds } from "../getTopLevelSelectedIds";

type Objects = Record<string, ObjectState>;

const rect = (id: string, parentId?: string): RectState =>
	({ id, type: "rect", parentId }) as RectState;

const group = (id: string, childIds: string[], parentId?: string): GroupState =>
	({ id, type: "group", childIds, parentId }) as unknown as GroupState;

describe("getTopLevelSelectedIds", () => {
	// ─── 基本ケース ────────────────────────────────────────────────

	it("祖先が選択されていないアイテムはそのまま返す", () => {
		const objects: Objects = {
			"rect-1": rect("rect-1"),
			"rect-2": rect("rect-2"),
		};
		expect(getTopLevelSelectedIds(["rect-1", "rect-2"], objects)).toEqual([
			"rect-1",
			"rect-2",
		]);
	});

	it("空配列を渡すと空配列を返す", () => {
		expect(getTopLevelSelectedIds([], {})).toEqual([]);
	});

	it("1件だけの選択はそのまま返す", () => {
		const objects: Objects = { "rect-1": rect("rect-1") };
		expect(getTopLevelSelectedIds(["rect-1"], objects)).toEqual(["rect-1"]);
	});

	// ─── 祖先と子孫が混在する選択 ─────────────────────────────────

	it("グループとその直接の子が混在するとき、子を除外してグループだけを返す", () => {
		const objects: Objects = {
			"group-a": group("group-a", ["rect-1", "rect-2"]),
			"rect-1": rect("rect-1", "group-a"),
			"rect-2": rect("rect-2", "group-a"),
		};
		const result = getTopLevelSelectedIds(
			["group-a", "rect-1", "rect-2"],
			objects,
		);
		expect(result).toEqual(["group-a"]);
	});

	it("グループと子の一部が混在するとき、その子だけを除外する", () => {
		const objects: Objects = {
			"group-a": group("group-a", ["rect-1", "rect-2"]),
			"rect-1": rect("rect-1", "group-a"),
			"rect-2": rect("rect-2", "group-a"),
		};
		// rect-2 は選択されていない → group-a + rect-1 の混在
		const result = getTopLevelSelectedIds(["group-a", "rect-1"], objects);
		expect(result).toEqual(["group-a"]);
	});

	it("グループと孫（2階層下）が混在するとき、孫を除外する", () => {
		const objects: Objects = {
			"group-outer": group("group-outer", ["group-inner"]),
			"group-inner": group("group-inner", ["rect-1"], "group-outer"),
			"rect-1": rect("rect-1", "group-inner"),
		};
		const result = getTopLevelSelectedIds(
			["group-outer", "group-inner", "rect-1"],
			objects,
		);
		expect(result).toEqual(["group-outer"]);
	});

	// ─── 複数グループの混在 ────────────────────────────────────────

	it("複数グループとそれぞれの子が混在するとき、各グループだけを返す", () => {
		const objects: Objects = {
			"group-a": group("group-a", ["rect-1", "rect-2"]),
			"group-b": group("group-b", ["rect-3", "rect-4"]),
			"rect-1": rect("rect-1", "group-a"),
			"rect-2": rect("rect-2", "group-a"),
			"rect-3": rect("rect-3", "group-b"),
			"rect-4": rect("rect-4", "group-b"),
		};
		const result = getTopLevelSelectedIds(
			["group-a", "group-b", "rect-1", "rect-2", "rect-3", "rect-4"],
			objects,
		);
		expect(result).toEqual(["group-a", "group-b"]);
	});

	it("グループAとグループBの子が混在し、グループAの子のみ除外する", () => {
		const objects: Objects = {
			"group-a": group("group-a", ["rect-1", "rect-2"]),
			"group-b": group("group-b", ["rect-3", "rect-4"]),
			"rect-1": rect("rect-1", "group-a"),
			"rect-2": rect("rect-2", "group-a"),
			"rect-3": rect("rect-3", "group-b"),
		};
		// group-b は選択されていないので rect-3 はそのまま残る
		const result = getTopLevelSelectedIds(
			["group-a", "rect-1", "rect-2", "rect-3"],
			objects,
		);
		expect(result).toEqual(["group-a", "rect-3"]);
	});

	// ─── 祖先が選択されていないケース ─────────────────────────────

	it("グループの子だけが選択されているとき（グループ自体は未選択）、子をそのまま返す", () => {
		const objects: Objects = {
			"group-a": group("group-a", ["rect-1", "rect-2"]),
			"rect-1": rect("rect-1", "group-a"),
			"rect-2": rect("rect-2", "group-a"),
		};
		const result = getTopLevelSelectedIds(["rect-1", "rect-2"], objects);
		expect(result).toEqual(["rect-1", "rect-2"]);
	});

	it("ネストしたグループの一部の子孫だけが選択されているとき、そのまま返す", () => {
		const objects: Objects = {
			"group-outer": group("group-outer", ["group-inner"]),
			"group-inner": group("group-inner", ["rect-1", "rect-2"], "group-outer"),
			"rect-1": rect("rect-1", "group-inner"),
			"rect-2": rect("rect-2", "group-inner"),
		};
		// どの祖先も選択されていない → フィルタなし
		const result = getTopLevelSelectedIds(["rect-1", "rect-2"], objects);
		expect(result).toEqual(["rect-1", "rect-2"]);
	});

	// ─── 順序の保持 ────────────────────────────────────────────────

	it("入力の順序を保持して返す", () => {
		const objects: Objects = {
			"group-a": group("group-a", ["rect-1"]),
			"group-b": group("group-b", ["rect-2"]),
			"rect-1": rect("rect-1", "group-a"),
			"rect-2": rect("rect-2", "group-b"),
		};
		const result = getTopLevelSelectedIds(
			["group-b", "group-a", "rect-1", "rect-2"],
			objects,
		);
		expect(result).toEqual(["group-b", "group-a"]);
	});
});
