import type { CanvasHandle } from "@jiscribe/canvas";
import { describe, expect, it, vi } from "vitest";

import { createCanvasHandleControl } from "../createCanvasHandleControl";

const CAMERA = { minX: 10, minY: 20, zoom: 2 };

/** A handle with only the members these tests reach, each a spy. */
const createFakeCanvas = () => {
	const fake = {
		selection: {
			select: vi.fn((ids: readonly string[]) => ({
				selectedIds: ids.slice(0, 1),
				ignoredIds: ids.slice(1),
				extra: "not part of the result",
			})),
		},
		viewport: {
			setViewport: vi.fn(),
			getViewport: vi.fn(() => ({ ...CAMERA, zoom: 1 })),
			fitToSelection: vi.fn(() => ({ ...CAMERA, zoom: 3 })),
			fitToContent: vi.fn(() => ({ ...CAMERA, zoom: 4 })),
		},
		measure: {
			hitTest: vi.fn(() => []),
		},
		export: {
			toSvgString: vi.fn(async () => "<svg/>"),
		},
	};
	return { fake, handle: fake as unknown as CanvasHandle };
};

describe("createCanvasHandleControl", () => {
	describe("with no canvas on screen", () => {
		const control = createCanvasHandleControl(() => null);

		it("reports itself unavailable", () => {
			expect(control.isAvailable()).toBe(false);
		});

		it("drops every id it was asked to select", () => {
			expect(control.selectObjects(["a", "b"])).toEqual({
				selectedIds: [],
				ignoredIds: ["a", "b"],
			});
		});

		it("answers null or empty instead of throwing", async () => {
			expect(control.getSelectedIds()).toEqual([]);
			expect(control.setView(CAMERA)).toBeNull();
			expect(control.getView()).toBeNull();
			expect(control.fitView("all")).toBeNull();
			expect(control.findOverlaps(["a"])).toEqual([]);
			expect(control.hitTest({ x: 0, y: 0 }, 4)).toEqual([]);
			expect(await control.toSvgString()).toBeNull();
		});
	});

	it("hands back only the two id lists of a selection", () => {
		const { handle } = createFakeCanvas();
		const control = createCanvasHandleControl(() => handle);
		expect(control.selectObjects(["a", "b"])).toEqual({
			selectedIds: ["a"],
			ignoredIds: ["b"],
		});
	});

	it("returns the camera it was given from setView, not the frame read back", () => {
		const { fake, handle } = createFakeCanvas();
		const control = createCanvasHandleControl(() => handle);
		expect(control.setView(CAMERA)).toBe(CAMERA);
		expect(fake.viewport.setViewport).toHaveBeenCalledWith(CAMERA);
		expect(fake.viewport.getViewport).not.toHaveBeenCalled();
	});

	it("fits to the selection, or to all the content for any other target", () => {
		const { fake, handle } = createFakeCanvas();
		const control = createCanvasHandleControl(() => handle);
		expect(control.fitView("selection")?.zoom).toBe(3);
		expect(control.fitView("all")?.zoom).toBe(4);
		expect(fake.viewport.fitToSelection).toHaveBeenCalledTimes(1);
		expect(fake.viewport.fitToContent).toHaveBeenCalledTimes(1);
	});

	it("passes the hit test's tolerance as an option", () => {
		const { fake, handle } = createFakeCanvas();
		createCanvasHandleControl(() => handle).hitTest({ x: 1, y: 2 }, 6);
		expect(fake.measure.hitTest).toHaveBeenCalledWith(
			{ x: 1, y: 2 },
			{ tolerance: 6 },
		);
	});

	it("exports the SVG without the embedded source", async () => {
		const { fake, handle } = createFakeCanvas();
		expect(await createCanvasHandleControl(() => handle).toSvgString()).toBe(
			"<svg/>",
		);
		expect(fake.export.toSvgString).toHaveBeenCalledWith({
			includeSource: false,
		});
	});

	it("reads the handle on every call, following a canvas that comes and goes", () => {
		const { handle } = createFakeCanvas();
		let current: CanvasHandle | null = null;
		const control = createCanvasHandleControl(() => current);
		expect(control.isAvailable()).toBe(false);
		current = handle;
		expect(control.isAvailable()).toBe(true);
	});
});
