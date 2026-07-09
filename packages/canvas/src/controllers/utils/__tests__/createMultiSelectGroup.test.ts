import { describe, it, expect } from "vitest";

import { MIN_GROUP_DIMENSION } from "../../../constants/groupDimensions";
import { MULTI_SELECT_GROUP } from "../../../constants/multiSelectGroup";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { createMultiSelectGroup } from "../createMultiSelectGroup";

const rect = (
	id: string,
	cx: number,
	cy: number,
	width: number,
	height: number,
): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width,
		height,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

describe("createMultiSelectGroup", () => {
	it("0 selectedIds -> null", () => {
		expect(createMultiSelectGroup([], {})).toBeNull();
	});

	it("1 selectedId -> null", () => {
		const objects = { r1: rect("r1", 50, 50, 40, 40) };
		expect(createMultiSelectGroup(["r1"], objects)).toBeNull();
	});

	it("no valid objects found (all missing) -> null", () => {
		expect(createMultiSelectGroup(["a", "b"], {})).toBeNull();
	});

	it("two rects -> returns a GroupState with the correct cx/cy/width/height", () => {
		const r1 = rect("r1", 50, 50, 40, 40); // left=30, right=70, top=30, bottom=70
		const r2 = rect("r2", 150, 150, 40, 40); // left=130, right=170, top=130, bottom=170
		const objects = { r1, r2 };
		const result = createMultiSelectGroup(["r1", "r2"], objects);
		expect(result).not.toBeNull();
		expect(result?.cx).toBeCloseTo(100); // (30+170)/2
		expect(result?.cy).toBeCloseTo(100);
		expect(result?.width).toBeCloseTo(140); // 170-30
		expect(result?.height).toBeCloseTo(140);
	});

	it("the returned GroupState has MULTI_SELECT_GROUP.ID", () => {
		const r1 = rect("r1", 0, 0, 10, 10);
		const r2 = rect("r2", 100, 0, 10, 10);
		const result = createMultiSelectGroup(["r1", "r2"], { r1, r2 });
		expect(result?.id).toBe(MULTI_SELECT_GROUP.ID);
	});

	it("the returned GroupState's childIds are the selectedIds", () => {
		const r1 = rect("r1", 0, 0, 10, 10);
		const r2 = rect("r2", 100, 0, 10, 10);
		const result = createMultiSelectGroup(["r1", "r2"], { r1, r2 });
		expect(result?.childIds).toEqual(["r1", "r2"]);
	});

	it("returns with rotation=0 / scaleX=1 / scaleY=1", () => {
		const r1 = rect("r1", 0, 0, 10, 10);
		const r2 = rect("r2", 50, 0, 10, 10);
		const result = createMultiSelectGroup(["r1", "r2"], { r1, r2 });
		expect(result?.rotation).toBe(0);
		expect(result?.scaleX).toBe(1);
		expect(result?.scaleY).toBe(1);
	});

	it("inherits lockAspectRatio from existingMultiSelectGroup", () => {
		const r1 = rect("r1", 0, 0, 10, 10);
		const r2 = rect("r2", 50, 0, 10, 10);
		const existing = { lockAspectRatio: false } as GroupState;
		const result = createMultiSelectGroup(["r1", "r2"], { r1, r2 }, existing);
		expect(result?.lockAspectRatio).toBe(false);
	});

	it("lockAspectRatio defaults to true when there is no existingMultiSelectGroup", () => {
		const r1 = rect("r1", 0, 0, 10, 10);
		const r2 = rect("r2", 50, 0, 10, 10);
		const result = createMultiSelectGroup(["r1", "r2"], { r1, r2 });
		expect(result?.lockAspectRatio).toBe(true);
	});

	it("a selection containing a connector includes its resolved endpoints in the bounds", () => {
		const r1 = rect("r1", 300, 300, 100, 100); // 250..350 both axes
		const connector: ObjectState = {
			id: "c1",
			type: "connector",
			points: [],
			routing: "straight",
			source: { anchor: { kind: "free", point: { x: 10, y: 20 } } },
			target: { anchor: { kind: "free", point: { x: 110, y: 70 } } },
		} as unknown as ObjectState;
		const result = createMultiSelectGroup(["r1", "c1"], { r1, c1: connector });
		expect(result).not.toBeNull();
		// Union of rect (250..350) and connector endpoints (10..110 / 20..70)
		expect(result?.cx).toBeCloseTo((10 + 350) / 2);
		expect(result?.cy).toBeCloseTo((20 + 350) / 2);
		expect(result?.width).toBeCloseTo(340);
		expect(result?.height).toBeCloseTo(330);
	});

	it("a connector inside a selected group contributes its resolved endpoints", () => {
		const connector: ObjectState = {
			id: "c1",
			type: "connector",
			points: [],
			routing: "straight",
			source: { anchor: { kind: "free", point: { x: 0, y: 0 } } },
			target: { anchor: { kind: "free", point: { x: 100, y: 100 } } },
		} as unknown as ObjectState;
		const g: ObjectState = {
			id: "g",
			type: "group",
			childIds: ["c1"],
		} as unknown as ObjectState;
		const r2 = rect("r2", 300, 50, 20, 20); // 290..310 x, 40..60 y
		const result = createMultiSelectGroup(["g", "r2"], {
			c1: connector,
			g,
			r2,
		});
		expect(result).not.toBeNull();
		expect(result?.cx).toBeCloseTo((0 + 310) / 2);
		expect(result?.cy).toBeCloseTo((0 + 100) / 2);
	});

	it("uses precomputed bboxes for bounds when supplied (marquee hot path)", () => {
		const r1 = rect("r1", 50, 50, 40, 40); // 30..70
		const r2 = rect("r2", 150, 150, 40, 40); // 130..170
		const precomputedBBoxes = {
			r1: { left: 30, top: 30, right: 70, bottom: 70 },
			r2: { left: 130, top: 130, right: 170, bottom: 170 },
		};
		const result = createMultiSelectGroup(
			["r1", "r2"],
			{ r1, r2 },
			null,
			precomputedBBoxes,
		);
		// Same result as the recursive-traversal path.
		expect(result?.cx).toBeCloseTo(100);
		expect(result?.cy).toBeCloseTo(100);
		expect(result?.width).toBeCloseTo(140);
		expect(result?.height).toBeCloseTo(140);
	});

	it("collinear selection -> width/height are clamped to MIN_GROUP_DIMENSION (issue #35)", () => {
		// two horizontal polylines on the same y → the selection AABB's height is 0.
		// The multi-select group's size is a divisor when scaling the selection,
		// so it must never be zero.
		const polyline = (
			id: string,
			points: { x: number; y: number }[],
		): ObjectState =>
			({ id, type: "polyline", points }) as unknown as ObjectState;
		const p1 = polyline("p1", [
			{ x: 0, y: 50 },
			{ x: 40, y: 50 },
		]);
		const p2 = polyline("p2", [
			{ x: 60, y: 50 },
			{ x: 100, y: 50 },
		]);
		const result = createMultiSelectGroup(["p1", "p2"], { p1, p2 });
		expect(result).not.toBeNull();
		expect(result?.width).toBeCloseTo(100);
		expect(result?.height).toBe(MIN_GROUP_DIMENSION);
	});

	it("nested groups -> computed from the grandchild elements' bounding boxes", () => {
		const r1 = rect("r1", 0, 0, 20, 20);
		const innerGroup: ObjectState = {
			id: "inner",
			type: "group",
			childIds: ["r1"],
		} as unknown as ObjectState;
		const r2 = rect("r2", 100, 0, 20, 20);
		const objects = { r1, r2, inner: innerGroup };
		const result = createMultiSelectGroup(["inner", "r2"], objects);
		expect(result).not.toBeNull();
		// inner's child r1: cx=0,cy=0,w=20,h=20 -> left=-10, right=10
		// r2: cx=100,cy=0,w=20,h=20 -> left=90, right=110
		expect(result?.cx).toBeCloseTo(50);
	});
});
