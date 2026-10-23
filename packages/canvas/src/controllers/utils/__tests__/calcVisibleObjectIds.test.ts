import type { Point } from "@jiscribe/geometry";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveConnectorPointsCached } from "../../../connectors/endpoints";
import type * as RouteOrthogonalConnectorModule from "../../../connectors/routing/routeOrthogonalConnector";
import type { MovePreview } from "../../../rendering/layers/content/MovePreview";
import type { Viewport } from "../../../rendering/Viewport";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../states/objects/connector/ConnectorState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import {
	calcVisibleObjectIds,
	VIEWPORT_CULL_MARGIN,
} from "../calcVisibleObjectIds";

// Counts the orthogonal router's runs, passing every call through.
const routerCalls = vi.hoisted(() => ({ count: 0 }));
vi.mock(
	"../../../connectors/routing/routeOrthogonalConnector",
	async (importOriginal) => {
		const original =
			await importOriginal<typeof RouteOrthogonalConnectorModule>();
		return {
			routeOrthogonalConnector: (
				...args: Parameters<typeof original.routeOrthogonalConnector>
			) => {
				routerCalls.count++;
				return original.routeOrthogonalConnector(...args);
			},
		};
	},
);

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

const registries = createTestRegistries();

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
			registries,
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
			registries,
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
			calcVisibleObjectIds({
				registries,
				objects: { r: obj },
				rootIds: ["r"],
				viewport,
			}).visibleIds,
		).toEqual(new Set(["r"]));
		expect(
			calcVisibleObjectIds({
				registries,
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
			registries,
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
			registries,
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
			registries,
			objects: { crossing, offscreenLine },
			rootIds: ["crossing", "offscreenLine"],
			viewport,
		});
		expect(visibleIds).toEqual(new Set(["crossing"]));
	});

	it("conservatively includes objects without a computable bbox", () => {
		const emptyPoly = poly("emptyPoly", []);
		const { visibleIds } = calcVisibleObjectIds({
			registries,
			objects: { emptyPoly },
			rootIds: ["emptyPoly"],
			viewport,
		});
		expect(visibleIds).toEqual(new Set(["emptyPoly"]));
	});

	it("always includes the text-edit target even when offscreen", () => {
		const editing = rect("editing", 5000, 5000, 100, 100);
		const { visibleIds } = calcVisibleObjectIds({
			registries,
			objects: { editing },
			rootIds: ["editing"],
			viewport,
			textEditObjectId: "editing",
		});
		expect(visibleIds).toEqual(new Set(["editing"]));
	});

	it("ignores rootIds entries missing from the objects map", () => {
		const { visibleIds } = calcVisibleObjectIds({
			registries,
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
			const first = calcVisibleObjectIds({
				registries,
				objects,
				rootIds: ["r"],
				viewport,
			});
			const second = calcVisibleObjectIds({
				registries,
				objects,
				rootIds: ["r"],
				viewport,
				prevCache: first.bboxCache,
			});
			expect(second.bboxCache.get("r")).toBe(first.bboxCache.get("r"));
		});

		it("recomputes when the object identity changed", () => {
			const first = calcVisibleObjectIds({
				registries,
				objects: { r: rect("r", 500, 400, 100, 100) },
				rootIds: ["r"],
				viewport,
			});
			const moved = rect("r", 5000, 400, 100, 100);
			const second = calcVisibleObjectIds({
				registries,
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
				registries,
				objects: { c: connector, r: rect("r", 100, 400, 100, 100) },
				rootIds: ["r", "c"],
				viewport,
			});
			const second = calcVisibleObjectIds({
				registries,
				objects: { c: connector, r: rect("r", 200, 400, 100, 100) },
				rootIds: ["r", "c"],
				viewport,
				prevCache: first.bboxCache,
			});
			expect(second.bboxCache.get("c")).not.toBe(first.bboxCache.get("c"));
		});

		it("reuses a connector's entry when an endpoint owner changed only in style", () => {
			const connector = {
				id: "c",
				type: "connector",
				points: [],
				routing: "straight",
				source: { owner: { id: "r" }, anchor: { kind: "center" } },
				target: { anchor: { kind: "free", point: { x: 900, y: 400 } } },
			} as unknown as ObjectState;
			const owner = rect("r", 100, 400, 100, 100);
			const first = calcVisibleObjectIds({
				registries,
				objects: { c: connector, r: owner },
				rootIds: ["r", "c"],
				viewport,
			});
			const restyled = { ...owner, fill: "#ff0000" } as ObjectState;
			const second = calcVisibleObjectIds({
				registries,
				objects: { c: connector, r: restyled },
				rootIds: ["r", "c"],
				viewport,
				prevCache: first.bboxCache,
			});
			// The box and the path it came from are carried over; the entry itself is
			// renewed so the next frame's identity check sees the restyled owner.
			expect(second.bboxCache.get("c")?.bbox).toBe(
				first.bboxCache.get("c")?.bbox,
			);
			expect(second.bboxCache.get("c")?.resolved).toBe(
				first.bboxCache.get("c")?.resolved,
			);
			expect(second.bboxCache.get("c")?.sourceOwner).toBe(restyled);
			expect(second.bboxCache.get("r")).not.toBe(first.bboxCache.get("r"));
		});

		it("reuses a connector's entry as is while it and its owners are unchanged", () => {
			const connector = {
				id: "c",
				type: "connector",
				points: [],
				routing: "straight",
				source: { owner: { id: "r" }, anchor: { kind: "center" } },
				target: { anchor: { kind: "free", point: { x: 900, y: 400 } } },
			} as unknown as ObjectState;
			const objects = { c: connector, r: rect("r", 100, 400, 100, 100) };
			const first = calcVisibleObjectIds({
				registries,
				objects,
				rootIds: ["r", "c"],
				viewport,
			});
			const second = calcVisibleObjectIds({
				registries,
				objects: { ...objects },
				rootIds: ["r", "c"],
				viewport: { ...viewport, minX: viewport.minX + 10 },
				prevCache: first.bboxCache,
			});
			expect(second.bboxCache.get("c")).toBe(first.bboxCache.get("c"));
		});
	});

	describe("connectors hanging off shapes", () => {
		const a = rect("a", 100, 100, 50, 50);
		const b = rect("b", 400, 100, 50, 50);
		const connector = {
			id: "c",
			type: "connector",
			points: [],
			routing: "orthogonal",
			source: { owner: { id: "a" }, anchor: { kind: "center" } },
			target: { owner: { id: "b" }, anchor: { kind: "center" } },
		} as unknown as ConnectorState;

		it("leaves the path it resolved for the connector renderer to reuse", () => {
			const countingRegistries = createTestRegistries();
			let outlineCalls = 0;
			countingRegistries.objectOutline.register("rect", (object) => {
				outlineCalls++;
				const { width, height } = object as unknown as {
					width: number;
					height: number;
				};
				return [
					{ x: -width / 2, y: -height / 2 },
					{ x: width / 2, y: -height / 2 },
					{ x: width / 2, y: height / 2 },
					{ x: -width / 2, y: height / 2 },
				];
			});
			calcVisibleObjectIds({
				registries: countingRegistries,
				objects: { a, b, c: connector },
				rootIds: ["a", "b", "c"],
				viewport,
			});
			const callsByCulling = outlineCalls;

			resolveConnectorPointsCached(
				connector,
				a,
				b,
				countingRegistries.objectOutline,
				countingRegistries.objectAnchorRegion,
				countingRegistries.objectExtraConnectPoints,
				countingRegistries.objectGeometryKey,
			);

			expect(callsByCulling).toBeGreaterThan(0);
			expect(outlineCalls).toBe(callsByCulling);
		});

		it("culls a connector by the path it resolved", () => {
			const offscreen = {
				...connector,
				id: "far",
				source: { owner: { id: "x" }, anchor: { kind: "center" } },
				target: { owner: { id: "y" }, anchor: { kind: "center" } },
			} as unknown as ConnectorState;
			const { visibleIds } = calcVisibleObjectIds({
				registries,
				objects: {
					a,
					b,
					c: connector,
					x: rect("x", 5000, 100, 50, 50),
					y: rect("y", 5400, 100, 50, 50),
					far: offscreen,
				},
				rootIds: ["a", "b", "c", "x", "y", "far"],
				viewport,
			});

			expect(visibleIds).toEqual(new Set(["a", "b", "c"]));
		});
	});

	describe("bounding a connector before routing it", () => {
		const orthogonalConnector = (
			id: string,
			sourceId: string,
			targetId: string,
		): ConnectorState =>
			({
				id,
				type: "connector",
				points: [],
				routing: "orthogonal",
				source: {
					owner: { id: sourceId },
					anchor: { kind: "connectPoint", id: "rightCenter" },
				},
				target: {
					owner: { id: targetId },
					anchor: { kind: "connectPoint", id: "leftCenter" },
				},
			}) as unknown as ConnectorState;

		beforeEach(() => {
			routerCalls.count = 0;
		});

		it("culls an offscreen connector without routing it", () => {
			const objects = {
				x: rect("x", 5000, 100, 50, 50),
				y: rect("y", 5400, 300, 50, 50),
				far: orthogonalConnector("far", "x", "y"),
			};
			const { visibleIds, bboxCache } = calcVisibleObjectIds({
				registries: createTestRegistries(),
				objects,
				rootIds: ["x", "y", "far"],
				viewport,
			});

			expect(visibleIds).toEqual(new Set());
			expect(routerCalls.count).toBe(0);
			expect(bboxCache.get("far")?.isBound).toBe(true);
		});

		it("still routes and shows an onscreen connector", () => {
			const objects = {
				a: rect("a", 100, 100, 50, 50),
				b: rect("b", 400, 300, 50, 50),
				c: orthogonalConnector("c", "a", "b"),
			};
			const { visibleIds, bboxCache } = calcVisibleObjectIds({
				registries: createTestRegistries(),
				objects,
				rootIds: ["a", "b", "c"],
				viewport,
			});

			expect(visibleIds).toEqual(new Set(["a", "b", "c"]));
			expect(routerCalls.count).toBe(1);
			expect(bboxCache.get("c")?.isBound).toBe(false);
		});

		it("routes a bounded connector once a pan brings its bound on screen, and judges it by the route", () => {
			const localRegistries = createTestRegistries();
			// Owners side by side on y = 400: the route ends on b's left edge
			// (x = 1475), its bound 31 past b's right edge (x = 1556).
			const objects = {
				a: rect("a", 1300, 400, 50, 50),
				b: rect("b", 1500, 400, 50, 50),
				c: orthogonalConnector("c", "a", "b"),
			};
			const rootIds = ["a", "b", "c"];
			const first = calcVisibleObjectIds({
				registries: localRegistries,
				objects,
				rootIds,
				viewport: { ...viewport, minX: 1560 + VIEWPORT_CULL_MARGIN },
				prevCache: undefined,
			});
			expect(first.visibleIds).toEqual(new Set());
			expect(routerCalls.count).toBe(0);

			// The cull rect now starts at x = 1500: the bound reaches it, the route
			// does not (b itself does).
			const second = calcVisibleObjectIds({
				registries: localRegistries,
				objects,
				rootIds,
				viewport: { ...viewport, minX: 1500 + VIEWPORT_CULL_MARGIN },
				prevCache: first.bboxCache,
			});
			expect(second.visibleIds).toEqual(new Set(["b"]));
			expect(routerCalls.count).toBe(1);
			expect(second.bboxCache.get("c")?.isBound).toBe(false);
			expect(second.bboxCache.get("c")?.bbox?.right).toBe(1475);
		});

		describe("during a move drag", () => {
			const startObjects = {
				a: rect("a", 5000, 100, 50, 50),
				b: rect("b", 5400, 300, 50, 50),
				c: orthogonalConnector("c", "a", "b"),
			};
			const rootIds = ["a", "b", "c"];
			const movedObjects = (delta: Point) => ({
				a: rect("a", 5000 + delta.x, 100 + delta.y, 50, 50),
				b: rect("b", 5400 + delta.x, 300 + delta.y, 50, 50),
				c: startObjects.c,
			});
			const preview = (delta: Point): MovePreview => ({
				delta,
				translatedIds: new Set(["a", "b"]),
				startObjects,
			});

			it("boxes a shifted connector by its start path moved by the delta, routing it once", () => {
				const localRegistries = createTestRegistries();
				const first = calcVisibleObjectIds({
					registries: localRegistries,
					objects: movedObjects({ x: -4800, y: 0 }),
					rootIds,
					viewport,
					movePreview: preview({ x: -4800, y: 0 }),
				});
				expect(first.visibleIds).toEqual(new Set(["a", "b", "c"]));
				expect(routerCalls.count).toBe(1);
				const entry = first.bboxCache.get("c");
				// The start path's box, unshifted, kept against the start owners.
				expect(entry?.sourceOwner).toBe(startObjects.a);
				expect(entry?.bbox?.left).toBe(5025);

				const second = calcVisibleObjectIds({
					registries: localRegistries,
					objects: movedObjects({ x: -4790, y: 5 }),
					rootIds,
					viewport,
					prevCache: first.bboxCache,
					movePreview: preview({ x: -4790, y: 5 }),
				});
				expect(second.visibleIds).toEqual(new Set(["a", "b", "c"]));
				expect(second.bboxCache.get("c")).toBe(entry);
				expect(routerCalls.count).toBe(1);
			});

			it("takes the delta rather than where the owners now are", () => {
				// The live owners stay off screen; only the declared delta brings
				// the drawn (shifted) connector into view.
				const { visibleIds } = calcVisibleObjectIds({
					registries: createTestRegistries(),
					objects: movedObjects({ x: 0, y: 1000 }),
					rootIds,
					viewport,
					movePreview: preview({ x: -4800, y: 0 }),
				});
				expect(visibleIds).toEqual(new Set(["c"]));
			});

			it("judges a connector with only one owner moved by its live path", () => {
				const { visibleIds } = calcVisibleObjectIds({
					registries: createTestRegistries(),
					objects: {
						...startObjects,
						a: rect("a", 200, 100, 50, 50),
					},
					rootIds,
					viewport,
					movePreview: {
						delta: { x: -4800, y: 0 },
						translatedIds: new Set(["a"]),
						startObjects,
					},
				});
				expect(visibleIds).toEqual(new Set(["a", "c"]));
			});
		});
	});
});
