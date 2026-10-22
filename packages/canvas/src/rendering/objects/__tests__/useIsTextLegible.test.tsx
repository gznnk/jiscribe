// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { createCanvasZoomStore } from "../../../controllers/hooks/utils/createCanvasZoomStore";
import type { CanvasZoomStore } from "../CanvasZoomStoreContext";
import { CanvasZoomStoreContext } from "../CanvasZoomStoreContext";
import {
	MIN_LEGIBLE_SCREEN_FONT_SIZE,
	useIsTextLegible,
} from "../useIsTextLegible";

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

/** What one probe answered on its newest render, and how often it rendered. */
type LegibilityProbe = { isLegible: boolean | null; renderCount: number };

let unmount: (() => void) | null = null;

afterEach(() => {
	unmount?.();
	unmount = null;
});

/** Mounts one probe per font size under `zoomStore` (or no store at all). */
const mountProbes = (
	zoomStore: CanvasZoomStore | null,
	maxFontSizes: number[],
): LegibilityProbe[] => {
	const probes = maxFontSizes.map((): LegibilityProbe => ({
		isLegible: null,
		renderCount: 0,
	}));
	const Probe = ({ index }: { index: number }) => {
		probes[index].isLegible = useIsTextLegible(maxFontSizes[index]);
		probes[index].renderCount += 1;
		return null;
	};
	const root = createRoot(document.createElement("div"));
	act(() =>
		root.render(
			<CanvasZoomStoreContext value={zoomStore}>
				{maxFontSizes.map((_, index) => (
					<Probe key={index} index={index} />
				))}
			</CanvasZoomStoreContext>,
		),
	);
	unmount = () => act(() => root.unmount());
	return probes;
};

describe("useIsTextLegible", () => {
	it("is legible with no canvas around, however small the text", () => {
		const [probe] = mountProbes(null, [0.01]);
		expect(probe.isLegible).toBe(true);
	});

	it("follows the zoom across the threshold, legible at the threshold itself", () => {
		const zoomStore = createCanvasZoomStore(1);
		const [probe] = mountProbes(zoomStore, [16]);
		expect(probe.isLegible).toBe(true);

		act(() => zoomStore.setZoom(0.2));
		expect(probe.isLegible).toBe(false);

		act(() => zoomStore.setZoom(MIN_LEGIBLE_SCREEN_FONT_SIZE / 16));
		expect(probe.isLegible).toBe(true);
	});

	it("is legible while a snapshot renders, at any zoom", () => {
		const zoomStore = createCanvasZoomStore(0.1);
		const [probe] = mountProbes(zoomStore, [16]);
		expect(probe.isLegible).toBe(false);

		act(() => zoomStore.setSnapshotRendering(true));
		expect(probe.isLegible).toBe(true);

		act(() => zoomStore.setSnapshotRendering(false));
		expect(probe.isLegible).toBe(false);
	});

	it("re-renders only the texts a zoom step moves across the threshold", () => {
		const zoomStore = createCanvasZoomStore(1);
		const [large, small] = mountProbes(zoomStore, [40, 10]);
		const largeRendersBefore = large.renderCount;
		const smallRendersBefore = small.renderCount;

		// 40 × 0.3 = 12px stays legible; 10 × 0.3 = 3px does not.
		act(() => zoomStore.setZoom(0.3));

		expect(large.renderCount).toBe(largeRendersBefore);
		expect(small.renderCount).toBe(smallRendersBefore + 1);
		expect(small.isLegible).toBe(false);
	});
});
