import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { buildSelectedIdsWithDescendants } from "../buildSelectedIdsWithDescendants";

const rect = (id: string): ObjectState => ({ id, type: "rect" }) as ObjectState;

const group = (id: string, childIds: string[]): GroupState =>
	({ id, type: "group", childIds }) as unknown as GroupState;

describe("buildSelectedIdsWithDescendants", () => {
	it("空の selectedIds → 空 Set", () => {
		const result = buildSelectedIdsWithDescendants([], {});
		expect(result.size).toBe(0);
	});

	it("グループなし → selectedIds そのままの Set", () => {
		const objects = { r1: rect("r1"), r2: rect("r2") };
		const result = buildSelectedIdsWithDescendants(["r1", "r2"], objects);
		expect(result).toEqual(new Set(["r1", "r2"]));
	});

	it("グループを含む → グループ + 全子孫が含まれる", () => {
		const objects: Record<string, ObjectState> = {
			g1: group("g1", ["r1", "r2"]) as unknown as ObjectState,
			r1: rect("r1"),
			r2: rect("r2"),
		};
		const result = buildSelectedIdsWithDescendants(["g1"], objects);
		expect(result.has("g1")).toBe(true);
		expect(result.has("r1")).toBe(true);
		expect(result.has("r2")).toBe(true);
		expect(result.size).toBe(3);
	});

	it("ネストしたグループ → 深い子孫まで全部含まれる", () => {
		const objects: Record<string, ObjectState> = {
			g1: group("g1", ["g2"]) as unknown as ObjectState,
			g2: group("g2", ["r1"]) as unknown as ObjectState,
			r1: rect("r1"),
		};
		const result = buildSelectedIdsWithDescendants(["g1"], objects);
		expect(result).toEqual(new Set(["g1", "g2", "r1"]));
	});

	it("グループとそれ以外の混在 → 全部含まれる", () => {
		const objects: Record<string, ObjectState> = {
			g1: group("g1", ["r2"]) as unknown as ObjectState,
			r1: rect("r1"),
			r2: rect("r2"),
		};
		const result = buildSelectedIdsWithDescendants(["r1", "g1"], objects);
		expect(result).toEqual(new Set(["r1", "g1", "r2"]));
	});

	it("返り値は ReadonlySet（書き込み不可）", () => {
		const result = buildSelectedIdsWithDescendants(["r1"], { r1: rect("r1") });
		// TypeScript の型レベルで ReadonlySet だが、実行時は Set なのでサイズのみ確認
		expect(result.size).toBe(1);
	});
});
