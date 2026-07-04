import { beforeAll, describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../../../states/objects/primitives/group/GroupState";
import { initializeObjectRegistry } from "../../../../../../setup/initializeObjectRegistry";
import { calcMultiSelectGroupBounds } from "../calcMultiSelectGroupBounds";

beforeAll(() => {
	initializeObjectRegistry();
});

const freeConnector = (
	id: string,
	source: { x: number; y: number },
	target: { x: number; y: number },
): ObjectState =>
	({
		id,
		type: "connector",
		points: [],
		routing: "straight",
		source: { anchor: { kind: "free", point: source } },
		target: { anchor: { kind: "free", point: target } },
	}) as unknown as ObjectState;

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

describe("calcMultiSelectGroupBounds", () => {
	it("0 selectedIds -> null", () => {
		expect(calcMultiSelectGroupBounds([], {})).toBeNull();
	});

	it("1 selectedId -> null", () => {
		const objects = { r1: rect("r1", 50, 50, 40, 40) };
		expect(calcMultiSelectGroupBounds(["r1"], objects)).toBeNull();
	});

	it("no valid objects found -> null", () => {
		expect(calcMultiSelectGroupBounds(["a", "b"], {})).toBeNull();
	});

	describe("without existingGroup (AABB calculation)", () => {
		it("2 rects -> returns the AABB's cx/cy/width/height", () => {
			const r1 = rect("r1", 50, 50, 40, 40); // left=30, right=70, top=30, bottom=70
			const r2 = rect("r2", 150, 150, 40, 40); // left=130, right=170, top=130, bottom=170
			const result = calcMultiSelectGroupBounds(["r1", "r2"], { r1, r2 });
			expect(result).not.toBeNull();
			expect(result?.cx).toBeCloseTo(100);
			expect(result?.cy).toBeCloseTo(100);
			expect(result?.width).toBeCloseTo(140);
			expect(result?.height).toBeCloseTo(140);
		});

		it("nested group -> computes from the grandchild elements' points", () => {
			const r1 = rect("r1", 0, 0, 20, 20);
			const innerGroup: ObjectState = {
				id: "inner",
				type: "group",
				childIds: ["r1"],
			} as unknown as ObjectState;
			const r2 = rect("r2", 100, 0, 20, 20);
			const objects = { r1, r2, inner: innerGroup };
			const result = calcMultiSelectGroupBounds(["inner", "r2"], objects);
			expect(result).not.toBeNull();
			expect(result?.cx).toBeCloseTo(50);
		});

		it("a connector's resolved endpoints are included in the bounds", () => {
			const r1 = rect("r1", 300, 300, 100, 100); // 250..350 both axes
			const c1 = freeConnector("c1", { x: 10, y: 20 }, { x: 110, y: 70 });
			const result = calcMultiSelectGroupBounds(["r1", "c1"], { r1, c1 });
			expect(result).not.toBeNull();
			expect(result?.cx).toBeCloseTo((10 + 350) / 2);
			expect(result?.cy).toBeCloseTo((20 + 350) / 2);
			expect(result?.width).toBeCloseTo(340);
			expect(result?.height).toBeCloseTo(330);
		});

		it("a connector with a missing endpoint owner contributes nothing", () => {
			const r1 = rect("r1", 50, 50, 40, 40);
			const r2 = rect("r2", 150, 150, 40, 40);
			const broken: ObjectState = {
				id: "c1",
				type: "connector",
				points: [{ x: 9999, y: 9999 }],
				routing: "straight",
				source: {
					owner: { id: "missing-rect" },
					anchor: { kind: "center" },
				},
				target: { anchor: { kind: "free", point: { x: 0, y: 0 } } },
			} as unknown as ObjectState;
			const result = calcMultiSelectGroupBounds(["r1", "r2", "c1"], {
				r1,
				r2,
				c1: broken,
			});
			expect(result).not.toBeNull();
			// The unresolvable connector (and its waypoint at 9999) is skipped entirely
			expect(result?.cx).toBeCloseTo(100);
			expect(result?.width).toBeCloseTo(140);
		});
	});

	describe("with existingGroup (OBB calculation)", () => {
		it("existingGroup with rotation=0 -> same result as AABB", () => {
			const r1 = rect("r1", 50, 50, 40, 40);
			const r2 = rect("r2", 150, 150, 40, 40);
			const existingGroup = {
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
			} as GroupState;
			const result = calcMultiSelectGroupBounds(
				["r1", "r2"],
				{ r1, r2 },
				existingGroup,
			);
			expect(result).not.toBeNull();
			expect(result?.cx).toBeCloseTo(100);
			expect(result?.cy).toBeCloseTo(100);
		});

		it("existingGroup is null -> falls back to AABB calculation", () => {
			const r1 = rect("r1", 50, 50, 40, 40);
			const r2 = rect("r2", 150, 150, 40, 40);
			const result = calcMultiSelectGroupBounds(["r1", "r2"], { r1, r2 }, null);
			expect(result?.cx).toBeCloseTo(100);
		});

		it("a connector's resolved endpoints are included in the OBB point set", () => {
			const r1 = rect("r1", 300, 300, 100, 100); // 250..350 both axes
			const c1 = freeConnector("c1", { x: 10, y: 20 }, { x: 110, y: 70 });
			const existingGroup = {
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
			} as GroupState;
			const result = calcMultiSelectGroupBounds(
				["r1", "c1"],
				{ r1, c1 },
				existingGroup,
			);
			expect(result).not.toBeNull();
			expect(result?.cx).toBeCloseTo((10 + 350) / 2);
			expect(result?.cy).toBeCloseTo((20 + 350) / 2);
			expect(result?.width).toBeCloseTo(340);
			expect(result?.height).toBeCloseTo(330);
		});

		it("a rotated existingGroup computes the OBB from connector points too", () => {
			const c1 = freeConnector("c1", { x: 0, y: 0 }, { x: 100, y: 0 });
			const c2 = freeConnector("c2", { x: 0, y: 60 }, { x: 100, y: 60 });
			const existingGroup = {
				rotation: 90,
				scaleX: 1,
				scaleY: 1,
			} as GroupState;
			const result = calcMultiSelectGroupBounds(
				["c1", "c2"],
				{ c1, c2 },
				existingGroup,
			);
			expect(result).not.toBeNull();
			// 100x60 point extent seen through a 90-degree-rotated frame: axes swap
			expect(result?.width).toBeCloseTo(60);
			expect(result?.height).toBeCloseTo(100);
			expect(result?.cx).toBeCloseTo(50);
			expect(result?.cy).toBeCloseTo(30);
		});
	});
});
