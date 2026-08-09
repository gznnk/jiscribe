import { describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../../schemas/canvas/CanvasDoc";
import type { RectDoc } from "../../../schemas/objects/primitives/rect/RectDoc";
import { canvasToState } from "../../../states/canvas/CanvasMapper";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { EXPORT_FIT_PADDING, resolveExportOptions } from "../useCanvasExport";

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

const createStateWithRect = () => {
	const doc: CanvasDoc = {
		version: 1,
		root: [createRectDoc("rect-1")],
	} as unknown as CanvasDoc;
	return canvasToState(
		doc,
		registries.objectMapper,
		registries.objectContentResizer,
	);
};

const emptyState = { objects: {}, rootIds: [] };

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
});
