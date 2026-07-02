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
	// ─── basic cases ────────────────────────────────────────────────

	it("returns items as-is when no ancestor is selected", () => {
		const objects: Objects = {
			"rect-1": rect("rect-1"),
			"rect-2": rect("rect-2"),
		};
		expect(getTopLevelSelectedIds(["rect-1", "rect-2"], objects)).toEqual([
			"rect-1",
			"rect-2",
		]);
	});

	it("returns an empty array when passed an empty array", () => {
		expect(getTopLevelSelectedIds([], {})).toEqual([]);
	});

	it("a single-item selection is returned as-is", () => {
		const objects: Objects = { "rect-1": rect("rect-1") };
		expect(getTopLevelSelectedIds(["rect-1"], objects)).toEqual(["rect-1"]);
	});

	// ─── selections mixing ancestors and descendants ─────────────────────────────────

	it("when a group and its direct children are mixed, excludes the children and returns only the group", () => {
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

	it("when a group and some of its children are mixed, excludes only those children", () => {
		const objects: Objects = {
			"group-a": group("group-a", ["rect-1", "rect-2"]),
			"rect-1": rect("rect-1", "group-a"),
			"rect-2": rect("rect-2", "group-a"),
		};
		// rect-2 is not selected -> a mix of group-a + rect-1
		const result = getTopLevelSelectedIds(["group-a", "rect-1"], objects);
		expect(result).toEqual(["group-a"]);
	});

	it("when a group and a grandchild (two levels down) are mixed, excludes the grandchild", () => {
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

	// ─── multiple groups mixed ────────────────────────────────────────

	it("when multiple groups and their respective children are mixed, returns only each group", () => {
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

	it("with children of group A and group B mixed, excludes only group A's children", () => {
		const objects: Objects = {
			"group-a": group("group-a", ["rect-1", "rect-2"]),
			"group-b": group("group-b", ["rect-3", "rect-4"]),
			"rect-1": rect("rect-1", "group-a"),
			"rect-2": rect("rect-2", "group-a"),
			"rect-3": rect("rect-3", "group-b"),
		};
		// group-b is not selected, so rect-3 stays as-is
		const result = getTopLevelSelectedIds(
			["group-a", "rect-1", "rect-2", "rect-3"],
			objects,
		);
		expect(result).toEqual(["group-a", "rect-3"]);
	});

	// ─── cases where no ancestor is selected ─────────────────────────────

	it("when only a group's children are selected (the group itself is not), returns the children as-is", () => {
		const objects: Objects = {
			"group-a": group("group-a", ["rect-1", "rect-2"]),
			"rect-1": rect("rect-1", "group-a"),
			"rect-2": rect("rect-2", "group-a"),
		};
		const result = getTopLevelSelectedIds(["rect-1", "rect-2"], objects);
		expect(result).toEqual(["rect-1", "rect-2"]);
	});

	it("when only some descendants of a nested group are selected, returns them as-is", () => {
		const objects: Objects = {
			"group-outer": group("group-outer", ["group-inner"]),
			"group-inner": group("group-inner", ["rect-1", "rect-2"], "group-outer"),
			"rect-1": rect("rect-1", "group-inner"),
			"rect-2": rect("rect-2", "group-inner"),
		};
		// no ancestor is selected -> no filtering
		const result = getTopLevelSelectedIds(["rect-1", "rect-2"], objects);
		expect(result).toEqual(["rect-1", "rect-2"]);
	});

	// ─── order preservation ────────────────────────────────────────────────

	it("returns results preserving input order", () => {
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
