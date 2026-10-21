import { describe, expect, it } from "vitest";

import { resolveRenderedObjectIds } from "../resolveRenderedObjectIds";

const culledObjectIds = new Set(["on-screen"]);

describe("resolveRenderedObjectIds", () => {
	it("renders the culled set while no snapshot runs", () => {
		expect(resolveRenderedObjectIds(null, culledObjectIds)).toBe(
			culledObjectIds,
		);
	});

	it('renders the full tree for an "all" snapshot', () => {
		expect(resolveRenderedObjectIds("all", culledObjectIds)).toBeUndefined();
	});

	it("renders exactly the snapshot's set, off-screen ids included", () => {
		const renderScope = new Set(["off-screen"]);
		expect(resolveRenderedObjectIds(renderScope, culledObjectIds)).toBe(
			renderScope,
		);
	});
});
