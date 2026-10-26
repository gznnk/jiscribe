// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Viewport } from "../../../rendering/Viewport";
import { useDevicePixelSnappedViewport } from "../useDevicePixelSnappedViewport";

/**
 * The camera is re-snapped when the window moves to a display with another
 * scale factor — a change no resize reports, only the resolution media query —
 * and handed back as the same object while neither input changes.
 */

// Without this React treats every `act` below as unsupported and warns.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

/** The change listeners of every resolution query registered and not yet removed. */
const resolutionListeners = new Set<() => void>();

const setDevicePixelRatio = (ratio: number) => {
	Object.defineProperty(window, "devicePixelRatio", {
		configurable: true,
		value: ratio,
	});
};

beforeEach(() => {
	setDevicePixelRatio(1);
	vi.stubGlobal(
		"matchMedia",
		vi.fn((query: string) => ({
			media: query,
			matches: true,
			addEventListener: (_type: string, listener: () => void) =>
				resolutionListeners.add(listener),
			removeEventListener: (_type: string, listener: () => void) =>
				resolutionListeners.delete(listener),
		})),
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
	resolutionListeners.clear();
});

/** Moves the window to a display of `ratio`, as the media query would report it. */
const moveToDisplay = (ratio: number) => {
	setDevicePixelRatio(ratio);
	act(() => {
		for (const listener of [...resolutionListeners]) {
			listener();
		}
	});
};

const mountProbe = (initialViewport: Viewport) => {
	const returned: Viewport[] = [];
	const Probe = ({ viewport }: { viewport: Viewport }) => {
		returned.push(useDevicePixelSnappedViewport(viewport));
		return null;
	};
	const root = createRoot(document.createElement("div"));
	const render = (viewport: Viewport) =>
		act(() => {
			root.render(<Probe viewport={viewport} />);
		});
	render(initialViewport);
	return { returned, render, unmount: () => act(() => root.unmount()) };
};

const subPixelViewport: Viewport = {
	minX: 0.3,
	minY: 0.8,
	width: 800,
	height: 600,
	zoom: 1,
};

describe("useDevicePixelSnappedViewport", () => {
	it("snaps the camera to the grid of the current ratio", () => {
		const { returned, unmount } = mountProbe(subPixelViewport);
		expect(returned.at(-1)).toEqual({ ...subPixelViewport, minX: 0, minY: 1 });
		unmount();
	});

	it("re-snaps when the window moves to a display with another ratio", () => {
		const { returned, unmount } = mountProbe(subPixelViewport);
		moveToDisplay(2);
		expect(returned.at(-1)).toEqual({
			...subPixelViewport,
			minX: 0.5,
			minY: 1,
		});
		// The query built for the old ratio is dropped for one built for the new.
		expect(resolutionListeners.size).toBe(1);
		unmount();
		expect(resolutionListeners.size).toBe(0);
	});

	it("hands back the same snapped object while the viewport and ratio hold", () => {
		const { returned, render, unmount } = mountProbe(subPixelViewport);
		const snapped = returned.at(-1);
		render(subPixelViewport);
		expect(returned.at(-1)).toBe(snapped);
		unmount();
	});
});
