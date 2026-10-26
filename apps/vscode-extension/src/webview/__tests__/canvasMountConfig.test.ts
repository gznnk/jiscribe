import type {
	Camera,
	CanvasConfig,
	CanvasSidebarsState,
} from "@jiscribe/canvas";
import { standardDefaultPinnedCategoryIds } from "@jiscribe/standard-shapes";
import { describe, expect, it } from "vitest";

import { buildCanvasMountConfig } from "../canvasMountConfig";

const baseConfig: CanvasConfig = { plugins: [] };
const noRestoredView = { viewport: undefined, sidebars: undefined };

describe("buildCanvasMountConfig", () => {
	it("starts from the shape set's default pins when the user has none stored", () => {
		expect(
			buildCanvasMountConfig(baseConfig, noRestoredView, null)
				.pinnedCategoryIds,
		).toEqual(standardDefaultPinnedCategoryIds);
	});

	it("starts from the stored pins, an empty list included", () => {
		expect(
			buildCanvasMountConfig(baseConfig, noRestoredView, ["uml", "unknown"])
				.pinnedCategoryIds,
		).toEqual(["uml", "unknown"]);
		expect(
			buildCanvasMountConfig(baseConfig, noRestoredView, []).pinnedCategoryIds,
		).toEqual([]);
	});

	it("carries the base config and the restored view", () => {
		const viewport: Camera = { minX: 10, minY: 20, zoom: 2 };
		// Passed through untouched, so only its identity is asserted.
		const sidebars = {} as CanvasSidebarsState;
		const mountConfig = buildCanvasMountConfig(
			baseConfig,
			{ viewport, sidebars },
			null,
		);
		expect(mountConfig.plugins).toBe(baseConfig.plugins);
		expect(mountConfig.viewport).toBe(viewport);
		expect(mountConfig.sidebars).toBe(sidebars);
		expect(baseConfig).toEqual({ plugins: [] });
	});
});
