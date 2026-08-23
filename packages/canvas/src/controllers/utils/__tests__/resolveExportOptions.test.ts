import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import type { RectDoc } from "@jiscribe/doc/model/objects/primitives/rect/RectDoc";
import { describe, expect, it } from "vitest";

import { canvasToState } from "../../../states/canvas/CanvasMapper";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import {
	EXPORT_FIT_PADDING,
	resolveExportOptions,
} from "../resolveExportOptions";

/**
 * Verifies the conversion rules of resolveExportOptions (the pure function that
 * builds BuildExportSvgOptions from CanvasExportOptions at export time). SVG
 * generation and rasterization themselves are the responsibility of export/ and
 * are not covered here.
 */

const registries = createTestRegistries();

const createRectDoc = (id: string, x = 0, y = 0): RectDoc =>
	({
		id,
		type: "rect",
		x,
		y,
		width: 10,
		height: 10,
		rotation: 0,
		flipX: false,
		flipY: false,
	}) as unknown as RectDoc;

/** 800×600 of world at zoom 2, so a "viewport" region reads back as 400×300 of world. */
const testViewport = { minX: 20, minY: 10, width: 800, height: 600, zoom: 2 };

const createStateWithRects = (...rects: RectDoc[]) => {
	const doc: CanvasDoc = {
		version: 1,
		root: rects,
	} as unknown as CanvasDoc;
	return {
		...canvasToState(
			doc,
			registries.objectMapper,
			registries.objectContentResizer,
		),
		viewport: testViewport,
	};
};

const createStateWithRect = () => createStateWithRects(createRectDoc("rect-1"));

const emptyState = { objects: {}, rootIds: [], viewport: testViewport };

describe("resolveExportOptions", () => {
	it("applies EXPORT_FIT_PADDING as the default margin around the content bounds", () => {
		const state = createStateWithRect();
		const options = resolveExportOptions(state, registries.objectMapper);
		expect(options.viewBox).toEqual({
			x: -EXPORT_FIT_PADDING,
			y: -EXPORT_FIT_PADDING,
			width: 10 + EXPORT_FIT_PADDING * 2,
			height: 10 + EXPORT_FIT_PADDING * 2,
		});
	});

	it("derives the viewBox from content bounds + the given margin", () => {
		const state = createStateWithRect();
		const options = resolveExportOptions(
			state,
			registries.objectMapper,
			registries.objectVisualBounds,
			{
				margin: 5,
			},
		);
		expect(options.viewBox).toEqual({ x: -5, y: -5, width: 20, height: 20 });
	});

	it("omits the viewBox on an empty canvas (falls back to the current view)", () => {
		const options = resolveExportOptions(emptyState, registries.objectMapper);
		expect(options.viewBox).toBeUndefined();
	});

	it("guarantees height 1 and centers content for a degenerate range (horizontal polyline only) with margin 0", () => {
		// zero-height content: a horizontal polyline at y=100
		const horizontalPolyline = {
			id: "poly-1",
			type: "polyline",
			points: [
				{ x: 0, y: 100 },
				{ x: 50, y: 100 },
			],
		};
		const state = {
			objects: { "poly-1": horizontalPolyline },
			rootIds: ["poly-1"],
		} as unknown as Parameters<typeof resolveExportOptions>[0];
		const options = resolveExportOptions(
			state,
			registries.objectMapper,
			registries.objectVisualBounds,
			{
				margin: 0,
				includeSource: false,
			},
		);
		expect(options.viewBox).toEqual({
			x: 0,
			y: 99.5, // content (y=100) sits at the center of the height-1 band
			width: 50,
			height: 1,
		});
	});

	it("embeds the source doc by default", () => {
		const state = createStateWithRect();
		const options = resolveExportOptions(state, registries.objectMapper);
		expect(options.source?.root.map((obj) => obj.id)).toEqual(["rect-1"]);
	});

	it("omits the source when includeSource is false", () => {
		const state = createStateWithRect();
		const options = resolveExportOptions(
			state,
			registries.objectMapper,
			registries.objectVisualBounds,
			{
				includeSource: false,
			},
		);
		expect(options.source).toBeUndefined();
	});

	it('takes the "viewport" region exactly, without the margin', () => {
		const state = createStateWithRect();
		const options = resolveExportOptions(
			state,
			registries.objectMapper,
			registries.objectVisualBounds,
			{ region: "viewport", margin: 50 },
		);
		expect(options.viewBox).toEqual({ x: 20, y: 10, width: 400, height: 300 });
	});

	it("fits an { ids } region to those objects alone, margin included", () => {
		const state = createStateWithRects(
			createRectDoc("rect-1"),
			createRectDoc("rect-2", 500, 500),
		);
		const options = resolveExportOptions(
			state,
			registries.objectMapper,
			registries.objectVisualBounds,
			{ region: { ids: ["rect-2"] }, margin: 5 },
		);
		expect(options.viewBox).toEqual({
			x: 495,
			y: 495,
			width: 20,
			height: 20,
		});
	});

	it("omits the viewBox when an { ids } region matches nothing to measure", () => {
		const state = createStateWithRect();
		const options = resolveExportOptions(
			state,
			registries.objectMapper,
			registries.objectVisualBounds,
			{ region: { ids: ["missing"] } },
		);
		expect(options.viewBox).toBeUndefined();
	});

	it("takes a rect region exactly, without the margin", () => {
		const state = createStateWithRect();
		const options = resolveExportOptions(
			state,
			registries.objectMapper,
			registries.objectVisualBounds,
			{ region: { x: 1, y: 2, width: 30, height: 40 }, margin: 50 },
		);
		expect(options.viewBox).toEqual({ x: 1, y: 2, width: 30, height: 40 });
	});

	it('maps transparentBackground to "transparent", default to undefined (live theme background)', () => {
		expect(
			resolveExportOptions(
				emptyState,
				registries.objectMapper,
				registries.objectVisualBounds,
				{
					transparentBackground: true,
				},
			).background,
		).toBe("transparent");
		expect(
			resolveExportOptions(emptyState, registries.objectMapper).background,
		).toBeUndefined();
	});

	describe("view.padding", () => {
		const createStateWithViewPadding = (padding: Record<string, number>) => ({
			...createStateWithRect(),
			view: { padding },
		});

		it("frames a content region with the document's per-side padding", () => {
			const state = createStateWithViewPadding({
				top: 48,
				right: 64,
				bottom: 64,
				left: 64,
			});
			// The rect is 0,0..10,10.
			expect(
				resolveExportOptions(
					state,
					registries.objectMapper,
					registries.objectVisualBounds,
				).viewBox,
			).toEqual({ x: -64, y: -48, width: 138, height: 122 });
		});

		it("treats a side the document left out as 0", () => {
			const state = createStateWithViewPadding({ left: 20 });
			expect(
				resolveExportOptions(
					state,
					registries.objectMapper,
					registries.objectVisualBounds,
				).viewBox,
			).toEqual({ x: -20, y: 0, width: 30, height: 10 });
		});

		it("lets an explicit margin option override the document's padding", () => {
			const state = createStateWithViewPadding({ top: 48, left: 64 });
			expect(
				resolveExportOptions(
					state,
					registries.objectMapper,
					registries.objectVisualBounds,
					{ margin: 5 },
				).viewBox,
			).toEqual({ x: -5, y: -5, width: 20, height: 20 });
		});

		it("ignores the document's padding for a region taken exactly", () => {
			const state = createStateWithViewPadding({ top: 48, left: 64 });
			expect(
				resolveExportOptions(
					state,
					registries.objectMapper,
					registries.objectVisualBounds,
					{ region: "viewport" },
				).viewBox,
			).toEqual({ x: 20, y: 10, width: 400, height: 300 });
		});

		it("keeps EXPORT_FIT_PADDING for a document that declares no view", () => {
			const state = createStateWithRect();
			expect(state.view).toBeUndefined();
			expect(
				resolveExportOptions(state, registries.objectMapper).viewBox,
			).toEqual({
				x: -EXPORT_FIT_PADDING,
				y: -EXPORT_FIT_PADDING,
				width: 10 + EXPORT_FIT_PADDING * 2,
				height: 10 + EXPORT_FIT_PADDING * 2,
			});
		});

		it("keeps EXPORT_FIT_PADDING for a view that declares only an open mode", () => {
			const state = {
				...createStateWithRect(),
				view: { open: "fit-all" as const },
			};
			expect(
				resolveExportOptions(state, registries.objectMapper).viewBox?.x,
			).toBe(-EXPORT_FIT_PADDING);
		});
	});
});
