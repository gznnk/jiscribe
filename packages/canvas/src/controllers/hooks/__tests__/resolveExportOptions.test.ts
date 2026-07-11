import { describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../../schemas/canvas/CanvasDoc";
import type { RectDoc } from "../../../schemas/objects/primitives/rect/RectDoc";
import { canvasToState } from "../../../states/canvas/CanvasMapper";
import { createTestRegistries } from "../../setup/createCanvasRegistries";
import { EXPORT_FIT_PADDING, resolveExportOptions } from "../useCanvasExport";

/**
 * resolveExportOptions（エクスポート実行時に CanvasExportOptions →
 * BuildExportSvgOptions を組み立てる純粋関数）の変換規則を検証する。
 * SVG 生成・ラスタライズ自体は export/ 側の責務なのでここでは扱わない。
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
	return canvasToState(doc, registries.objectMapper);
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
		const options = resolveExportOptions(state, registries.objectMapper, {
			margin: 5,
		});
		expect(options.viewBox).toEqual({ x: -5, y: -5, width: 20, height: 20 });
	});

	it("omits the viewBox on an empty canvas (falls back to the current view)", () => {
		const options = resolveExportOptions(emptyState, registries.objectMapper);
		expect(options.viewBox).toBeUndefined();
	});

	it("embeds the source doc by default", () => {
		const state = createStateWithRect();
		const options = resolveExportOptions(state, registries.objectMapper);
		expect(options.source?.root.map((obj) => obj.id)).toEqual(["rect-1"]);
	});

	it("omits the source when includeSource is false", () => {
		const state = createStateWithRect();
		const options = resolveExportOptions(state, registries.objectMapper, {
			includeSource: false,
		});
		expect(options.source).toBeUndefined();
	});

	it('maps transparentBackground to "transparent", default to undefined (live theme background)', () => {
		expect(
			resolveExportOptions(emptyState, registries.objectMapper, {
				transparentBackground: true,
			}).background,
		).toBe("transparent");
		expect(
			resolveExportOptions(emptyState, registries.objectMapper).background,
		).toBeUndefined();
	});
});
