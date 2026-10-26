import { describe, expect, it, vi } from "vitest";

import { createCanvasZoomStore } from "../createCanvasZoomStore";

describe("createCanvasZoomStore", () => {
	it("starts at the given zoom, outside a snapshot", () => {
		const zoomStore = createCanvasZoomStore(0.5);
		expect(zoomStore.getZoom()).toBe(0.5);
		expect(zoomStore.isSnapshotRendering()).toBe(false);
	});

	it("notifies on a change of either value, and not on a write of the same one", () => {
		const zoomStore = createCanvasZoomStore(1);
		const listener = vi.fn();
		zoomStore.subscribe(listener);

		zoomStore.setZoom(1);
		zoomStore.setSnapshotRendering(false);
		expect(listener).not.toHaveBeenCalled();

		zoomStore.setZoom(0.25);
		expect(zoomStore.getZoom()).toBe(0.25);
		zoomStore.setSnapshotRendering(true);
		expect(zoomStore.isSnapshotRendering()).toBe(true);
		expect(listener).toHaveBeenCalledTimes(2);
	});

	it("stops notifying a listener once unsubscribed, however often that is called", () => {
		const zoomStore = createCanvasZoomStore(1);
		const listener = vi.fn();
		const unsubscribe = zoomStore.subscribe(listener);

		unsubscribe();
		unsubscribe();
		zoomStore.setZoom(2);

		expect(listener).not.toHaveBeenCalled();
	});
});
