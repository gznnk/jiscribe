import { describe, it, expect } from "vitest";

import { MIN_GROUP_DIMENSION } from "../../../../../../../constants/groupDimensions";
import type { ObjectState } from "../../../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../../../states/objects/primitives/group/GroupState";
import type { PolylineState } from "../../../../../../../states/objects/primitives/polyline/PolylineState";
import { transformFrameByGroup } from "../../../../objects/base/FrameTransform";
import { transformPolyByGroup } from "../../../../objects/base/PolyTransform";
import { calcMultiSelectGroupBounds } from "../calcMultiSelectGroupBounds";
import {
	calcMultiSelectGroupBoundsFromCache,
	createMultiSelectResizeBoundsCache,
} from "../multiSelectResizeBoundsCache";

const rect = (
	id: string,
	cx: number,
	cy: number,
	width: number,
	height: number,
	rotation = 0,
): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width,
		height,
		rotation,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

const polyline = (
	id: string,
	points: { x: number; y: number }[],
): ObjectState =>
	({
		id,
		type: "polyline",
		points,
	}) as unknown as ObjectState;

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

const group = (
	id: string,
	childIds: string[],
	frame: {
		cx: number;
		cy: number;
		width: number;
		height: number;
		rotation?: number;
		scaleX?: number;
		scaleY?: number;
	},
): GroupState =>
	({
		id,
		type: "group",
		childIds,
		cx: frame.cx,
		cy: frame.cy,
		width: frame.width,
		height: frame.height,
		rotation: frame.rotation ?? 0,
		scaleX: frame.scaleX ?? 1,
		scaleY: frame.scaleY ?? 1,
	}) as unknown as GroupState;

/**
 * Applies the same per-child transforms as transformChildren would during a
 * multi-select resize (connectors are identity — see ConnectorController).
 */
const applyGroupResize = (
	objects: Record<string, ObjectState>,
	startGroup: GroupState,
	updatedGroup: GroupState,
): Record<string, ObjectState> => {
	const updated: Record<string, ObjectState> = {};
	for (const [id, obj] of Object.entries(objects)) {
		if (obj.type === "connector") {
			updated[id] = obj;
		} else if (obj.type === "polyline" || obj.type === "polygon") {
			updated[id] = transformPolyByGroup(
				obj as PolylineState,
				startGroup,
				updatedGroup,
			);
		} else {
			updated[id] = transformFrameByGroup(
				obj as ObjectState & GroupState,
				startGroup,
				updatedGroup,
			);
		}
	}
	return updated;
};

/**
 * Asserts that the cache-derived bounds match the full point-collection path
 * on the post-resize object map (up to coordinate-rounding error).
 */
const expectBoundsMatchFullRecollection = (
	selectedIds: string[],
	startObjects: Record<string, ObjectState>,
	startGroup: GroupState,
	updatedGroup: GroupState,
) => {
	const updatedObjects = applyGroupResize(
		startObjects,
		startGroup,
		updatedGroup,
	);
	const expected = calcMultiSelectGroupBounds(
		selectedIds,
		updatedObjects,
		updatedGroup,
	);
	const cache = createMultiSelectResizeBoundsCache(
		selectedIds,
		startObjects,
		startGroup,
	);
	const actual = calcMultiSelectGroupBoundsFromCache(
		cache,
		updatedObjects,
		startGroup,
		updatedGroup,
	);

	expect(expected).not.toBeNull();
	expect(actual).not.toBeNull();
	expect(actual?.cx).toBeCloseTo(expected!.cx, 3);
	expect(actual?.cy).toBeCloseTo(expected!.cy, 3);
	expect(actual?.width).toBeCloseTo(expected!.width, 3);
	expect(actual?.height).toBeCloseTo(expected!.height, 3);
};

describe("createMultiSelectResizeBoundsCache", () => {
	it("classifies connectors and oblique frames as non-affine leaves", () => {
		const objects = {
			r1: rect("r1", 50, 50, 40, 40),
			r2: rect("r2", 150, 50, 40, 40, 90),
			r3: rect("r3", 250, 50, 40, 40, 30),
			p1: polyline("p1", [
				{ x: 0, y: 100 },
				{ x: 50, y: 140 },
			]),
			c1: freeConnector("c1", { x: 0, y: 0 }, { x: 300, y: 100 }),
		};
		const startGroup = group("multi-select", Object.keys(objects), {
			cx: 150,
			cy: 70,
			width: 300,
			height: 140,
		});

		const cache = createMultiSelectResizeBoundsCache(
			Object.keys(objects),
			objects,
			startGroup,
		);

		expect(cache.nonAffineLeafIds.sort()).toEqual(["c1", "r3"]);
		expect(cache.affineLocalExtents).not.toBeNull();
	});

	it("expands nested groups down to their leaves", () => {
		const objects: Record<string, ObjectState> = {
			r1: rect("r1", 50, 50, 40, 40),
			c1: freeConnector("c1", { x: 0, y: 0 }, { x: 100, y: 100 }),
			inner: group("inner", ["r1", "c1"], {
				cx: 50,
				cy: 50,
				width: 100,
				height: 100,
			}) as unknown as ObjectState,
			r2: rect("r2", 200, 50, 40, 40),
		};
		const startGroup = group("multi-select", ["inner", "r2"], {
			cx: 110,
			cy: 50,
			width: 220,
			height: 100,
		});

		const cache = createMultiSelectResizeBoundsCache(
			["inner", "r2"],
			objects,
			startGroup,
		);

		expect(cache.nonAffineLeafIds).toEqual(["c1"]);
		expect(cache.affineLocalExtents).not.toBeNull();
	});

	it("selection with no valid extent -> empty cache and null bounds", () => {
		const startGroup = group("multi-select", [], {
			cx: 0,
			cy: 0,
			width: 100,
			height: 100,
		});
		const cache = createMultiSelectResizeBoundsCache(
			["a", "b"],
			{},
			startGroup,
		);

		expect(cache.affineLocalExtents).toBeNull();
		expect(cache.nonAffineLeafIds).toEqual([]);
		expect(
			calcMultiSelectGroupBoundsFromCache(cache, {}, startGroup, startGroup),
		).toBeNull();
	});
});

describe("calcMultiSelectGroupBoundsFromCache", () => {
	it("axis-aligned rects + polyline, non-uniform resize -> matches the full recollection", () => {
		const objects = {
			r1: rect("r1", 50, 50, 40, 40),
			r2: rect("r2", 150, 100, 60, 20, 180),
			p1: polyline("p1", [
				{ x: 20, y: 120 },
				{ x: 80, y: 160 },
				{ x: 140, y: 130 },
			]),
		};
		const startGroup = group("multi-select", Object.keys(objects), {
			cx: 105,
			cy: 95,
			width: 150,
			height: 130,
		});
		const updatedGroup = group("multi-select", Object.keys(objects), {
			cx: 130,
			cy: 80,
			width: 240,
			height: 65,
		});

		expectBoundsMatchFullRecollection(
			Object.keys(objects),
			objects,
			startGroup,
			updatedGroup,
		);
	});

	it("rotated group with a 90-degree (orthogonal) child -> matches the full recollection", () => {
		const objects = {
			r1: rect("r1", 50, 50, 40, 20),
			r2: rect("r2", 150, 100, 60, 20, 90),
			p1: polyline("p1", [
				{ x: 20, y: 120 },
				{ x: 140, y: 160 },
			]),
		};
		const startGroup = group("multi-select", Object.keys(objects), {
			cx: 100,
			cy: 100,
			width: 160,
			height: 150,
			rotation: 30,
		});
		const updatedGroup = group("multi-select", Object.keys(objects), {
			cx: 90,
			cy: 120,
			width: 200,
			height: 100,
			rotation: 30,
		});

		expectBoundsMatchFullRecollection(
			Object.keys(objects),
			objects,
			startGroup,
			updatedGroup,
		);
	});

	it("oblique child frame is re-collected per frame -> matches the full recollection", () => {
		const objects = {
			r1: rect("r1", 50, 50, 40, 40),
			r2: rect("r2", 150, 50, 60, 30, 25),
		};
		const startGroup = group("multi-select", Object.keys(objects), {
			cx: 100,
			cy: 50,
			width: 170,
			height: 70,
		});
		const updatedGroup = group("multi-select", Object.keys(objects), {
			cx: 120,
			cy: 60,
			width: 100,
			height: 140,
		});

		expectBoundsMatchFullRecollection(
			Object.keys(objects),
			objects,
			startGroup,
			updatedGroup,
		);
	});

	it("connector stays in place (identity transform) -> matches the full recollection", () => {
		const objects = {
			r1: rect("r1", 50, 50, 40, 40),
			r2: rect("r2", 200, 150, 40, 40),
			c1: freeConnector("c1", { x: 70, y: 50 }, { x: 180, y: 150 }),
		};
		const startGroup = group("multi-select", Object.keys(objects), {
			cx: 125,
			cy: 100,
			width: 190,
			height: 140,
		});
		const updatedGroup = group("multi-select", Object.keys(objects), {
			cx: 150,
			cy: 100,
			width: 95,
			height: 280,
		});

		expectBoundsMatchFullRecollection(
			Object.keys(objects),
			objects,
			startGroup,
			updatedGroup,
		);
	});

	it("flip (negative scaleX) -> matches the full recollection", () => {
		const objects = {
			r1: rect("r1", 50, 50, 40, 40),
			p1: polyline("p1", [
				{ x: 100, y: 20 },
				{ x: 160, y: 90 },
			]),
		};
		const startGroup = group("multi-select", Object.keys(objects), {
			cx: 95,
			cy: 55,
			width: 130,
			height: 70,
		});
		const updatedGroup = group("multi-select", Object.keys(objects), {
			cx: 60,
			cy: 55,
			width: 200,
			height: 70,
			scaleX: -1,
		});

		expectBoundsMatchFullRecollection(
			Object.keys(objects),
			objects,
			startGroup,
			updatedGroup,
		);
	});

	it("collinear selection -> the degenerate axis is clamped to MIN_GROUP_DIMENSION", () => {
		const objects = {
			r1: rect("r1", 20, 50, 40, 0),
			r2: rect("r2", 80, 50, 40, 0),
		};
		const startGroup = group("multi-select", Object.keys(objects), {
			cx: 50,
			cy: 50,
			width: 100,
			height: MIN_GROUP_DIMENSION,
		});

		const cache = createMultiSelectResizeBoundsCache(
			Object.keys(objects),
			objects,
			startGroup,
		);
		const bounds = calcMultiSelectGroupBoundsFromCache(
			cache,
			objects,
			startGroup,
			startGroup,
		);

		expect(bounds).not.toBeNull();
		expect(bounds?.width).toBeCloseTo(100, 3);
		expect(bounds?.height).toBe(MIN_GROUP_DIMENSION);
	});
});
