import { describe, expect, it } from "vitest";

import type { Viewport } from "../../../states/canvas/Viewport";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import {
	calcVisibleObjectIds,
	VIEWPORT_CULL_MARGIN,
} from "../calcVisibleObjectIds";

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

const group = (id: string, childIds: string[]): GroupState =>
	({ id, type: "group", childIds }) as unknown as GroupState;

const poly = (
	id: string,
	points: Array<{ x: number; y: number }>,
): ObjectState => ({ id, type: "polyline", points }) as unknown as ObjectState;

const freeConnector = (
	id: string,
	sourcePoint: { x: number; y: number },
	targetPoint: { x: number; y: number },
): ObjectState =>
	({
		id,
		type: "connector",
		points: [],
		routing: "straight",
		source: { anchor: { kind: "free", point: sourcePoint } },
		target: { anchor: { kind: "free", point: targetPoint } },
	}) as unknown as ObjectState;

// Visible world rect: x/y 0..1000 x 0..800 (zoom 1), plus VIEWPORT_CULL_MARGIN
const viewport: Viewport = {
	minX: 0,
	minY: 0,
	width: 1000,
	height: 800,
	zoom: 1,
};

describe("calcVisibleObjectIds", () => {
	it("includes intersecting objects and excludes fully offscreen ones", () => {
		const inside = rect("inside", 500, 400, 100, 100);
		const offscreen = rect("offscreen", 5000, 400, 100, 100);
		const { visibleIds } = calcVisibleObjectIds({
			objects: { inside, offscreen },
			rootIds: ["inside", "offscreen"],
			viewport,
		});
		expect(visibleIds).toEqual(new Set(["inside"]));
	});

	it("keeps objects within the cull margin outside the viewport edge", () => {
		// right edge of the rect at x = -60: outside the viewport but within the margin
		const withinMargin = rect("withinMargin", -60 - 50, 400, 100, 100);
		// right edge at -(VIEWPORT_CULL_MARGIN + 10): beyond the margin
		const beyondMargin = rect(
			"beyondMargin",
			-(VIEWPORT_CULL_MARGIN + 10) - 50,
			400,
			100,
			100,
		);
		const { visibleIds } = calcVisibleObjectIds({
			objects: { withinMargin, beyondMargin },
			rootIds: ["withinMargin", "beyondMargin"],
			viewport,
		});
		expect(visibleIds).toEqual(new Set(["withinMargin"]));
	});

	it("shrinks the visible world rect when zoomed in", () => {
		// zoom 2 → visible world width is 500; x=700 is visible at zoom 1 only
		const obj = rect("r", 700, 200, 40, 40);
		const zoomedIn = { ...viewport, zoom: 2 };
		expect(
			calcVisibleObjectIds({ objects: { r: obj }, rootIds: ["r"], viewport })
				.visibleIds,
		).toEqual(new Set(["r"]));
		expect(
			calcVisibleObjectIds({
				objects: { r: obj },
				rootIds: ["r"],
				viewport: zoomedIn,
			}).visibleIds,
		).toEqual(new Set());
	});

	it("judges group children individually and includes the group when any child is visible", () => {
		const visibleChild = rect("visibleChild", 100, 100, 50, 50);
		const offscreenChild = rect("offscreenChild", 5000, 5000, 50, 50);
		const g = group("g", ["visibleChild", "offscreenChild"]);
		const { visibleIds } = calcVisibleObjectIds({
			objects: { g, visibleChild, offscreenChild },
			rootIds: ["g"],
			viewport,
		});
		expect(visibleIds).toEqual(new Set(["g", "visibleChild"]));
	});

	it("excludes a group whose descendants are all offscreen, through nesting", () => {
		const leaf = rect("leaf", 5000, 5000, 50, 50);
		const inner = group("inner", ["leaf"]);
		const outer = group("outer", ["inner"]);
		const { visibleIds } = calcVisibleObjectIds({
			objects: { outer, inner, leaf },
			rootIds: ["outer"],
			viewport,
		});
		expect(visibleIds).toEqual(new Set());
	});

	it("judges a connector by its own bbox even when both endpoints are offscreen", () => {
		// The line crosses the viewport horizontally; both endpoints are far outside
		const crossing = freeConnector(
			"crossing",
			{ x: -2000, y: 400 },
			{ x: 3000, y: 400 },
		);
		const offscreenLine = freeConnector(
			"offscreenLine",
			{ x: -2000, y: 5000 },
			{ x: 3000, y: 5000 },
		);
		const { visibleIds } = calcVisibleObjectIds({
			objects: { crossing, offscreenLine },
			rootIds: ["crossing", "offscreenLine"],
			viewport,
		});
		expect(visibleIds).toEqual(new Set(["crossing"]));
	});

	it("conservatively includes objects without a computable bbox", () => {
		const emptyPoly = poly("emptyPoly", []);
		const { visibleIds } = calcVisibleObjectIds({
			objects: { emptyPoly },
			rootIds: ["emptyPoly"],
			viewport,
		});
		expect(visibleIds).toEqual(new Set(["emptyPoly"]));
	});

	it("always includes the text-edit target even when offscreen", () => {
		const editing = rect("editing", 5000, 5000, 100, 100);
		const { visibleIds } = calcVisibleObjectIds({
			objects: { editing },
			rootIds: ["editing"],
			viewport,
			textEditObjectId: "editing",
		});
		expect(visibleIds).toEqual(new Set(["editing"]));
	});

	it("ignores rootIds entries missing from the objects map", () => {
		const { visibleIds } = calcVisibleObjectIds({
			objects: {},
			rootIds: ["missing"],
			viewport,
		});
		expect(visibleIds).toEqual(new Set());
	});

	describe("bbox cache", () => {
		it("reuses the cache entry while the object identity is unchanged", () => {
			const r = rect("r", 500, 400, 100, 100);
			const objects = { r };
			const first = calcVisibleObjectIds({ objects, rootIds: ["r"], viewport });
			const second = calcVisibleObjectIds({
				objects,
				rootIds: ["r"],
				viewport,
				prevCache: first.bboxCache,
			});
			expect(second.bboxCache.get("r")).toBe(first.bboxCache.get("r"));
		});

		it("recomputes when the object identity changed", () => {
			const first = calcVisibleObjectIds({
				objects: { r: rect("r", 500, 400, 100, 100) },
				rootIds: ["r"],
				viewport,
			});
			const moved = rect("r", 5000, 400, 100, 100);
			const second = calcVisibleObjectIds({
				objects: { r: moved },
				rootIds: ["r"],
				viewport,
				prevCache: first.bboxCache,
			});
			expect(second.bboxCache.get("r")).not.toBe(first.bboxCache.get("r"));
			expect(second.visibleIds).toEqual(new Set());
		});

		it("recomputes a connector when an endpoint owner moved, even if the connector itself is unchanged", () => {
			const connector = {
				id: "c",
				type: "connector",
				points: [],
				routing: "straight",
				source: { owner: { id: "r" }, anchor: { kind: "center" } },
				target: { anchor: { kind: "free", point: { x: 900, y: 400 } } },
			} as unknown as ObjectState;
			const first = calcVisibleObjectIds({
				objects: { c: connector, r: rect("r", 100, 400, 100, 100) },
				rootIds: ["r", "c"],
				viewport,
			});
			const second = calcVisibleObjectIds({
				objects: { c: connector, r: rect("r", 200, 400, 100, 100) },
				rootIds: ["r", "c"],
				viewport,
				prevCache: first.bboxCache,
			});
			expect(second.bboxCache.get("c")).not.toBe(first.bboxCache.get("c"));
		});
	});
});
