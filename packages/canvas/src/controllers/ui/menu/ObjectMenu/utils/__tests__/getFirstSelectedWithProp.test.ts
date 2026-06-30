import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import { getFirstSelectedWithProp } from "../getFirstSelectedWithProp";

const rect = (id: string, extra?: Record<string, unknown>): ObjectState =>
	({ id, type: "rect", ...extra }) as unknown as ObjectState;

const group = (
	id: string,
	childIds: string[],
	extra?: Record<string, unknown>,
): GroupState =>
	({
		id,
		type: "group",
		childIds,
		...extra,
	}) as unknown as GroupState;

describe("getFirstSelectedWithProp", () => {
	it("selectedIds が空 → undefined", () => {
		expect(getFirstSelectedWithProp([], {}, "fill")).toBeUndefined();
	});

	it("選択オブジェクト自体がプロパティを持つ → そのオブジェクトを返す", () => {
		const r = rect("r1", { fill: "#fff" });
		const result = getFirstSelectedWithProp(["r1"], { r1: r }, "fill");
		expect(result).toBe(r);
	});

	it("選択オブジェクトがプロパティを持たない → undefined", () => {
		const r = rect("r1");
		expect(getFirstSelectedWithProp(["r1"], { r1: r }, "fill")).toBeUndefined();
	});

	it("存在しない ID は飛ばして次を探す", () => {
		const r = rect("r2", { fill: "#000" });
		const result = getFirstSelectedWithProp(
			["missing", "r2"],
			{ r2: r },
			"fill",
		);
		expect(result).toBe(r);
	});

	it("グループ自体はプロパティを持たないが子孫が持つ → 子孫を返す", () => {
		const child = rect("child", { fill: "#f00" });
		const g = group("g1", ["child"]);
		const objects = { g1: g as unknown as ObjectState, child };
		const result = getFirstSelectedWithProp(["g1"], objects, "fill");
		expect(result).toBe(child);
	});

	it("複数選択時は selectedIds の順で最初に見つかったものを返す", () => {
		const r1 = rect("r1", { fill: "#aaa" });
		const r2 = rect("r2", { fill: "#bbb" });
		const result = getFirstSelectedWithProp(["r1", "r2"], { r1, r2 }, "fill");
		expect(result).toBe(r1);
	});

	it("どのオブジェクトもプロパティを持たない → undefined", () => {
		const objects = {
			r1: rect("r1"),
			g: group("g", ["r1"]) as unknown as ObjectState,
		};
		expect(getFirstSelectedWithProp(["g"], objects, "fill")).toBeUndefined();
	});
});
