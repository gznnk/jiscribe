// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import type { Viewport } from "../../../rendering/Viewport";
import type { Camera } from "../../CanvasTypes";
import { useNotifyViewportChange } from "../useNotifyViewportChange";

/**
 * When the host hears about the camera: never on mount, once per pan or zoom,
 * and not for a container resize or a new viewport object holding the same camera.
 */

// Without this React treats every `act` below as unsupported and warns.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const initialViewport: Viewport = {
	minX: 0,
	minY: 0,
	width: 800,
	height: 600,
	zoom: 1,
};

/**
 * Mounts the hook on a probe driven by re-rendering. A fresh callback is passed
 * on every render, as a host that does not memoize its own would.
 */
const renderHook = () => {
	const onViewportChange = vi.fn<(camera: Camera) => void>();
	const Probe = ({ viewport }: { viewport: Viewport }) => {
		useNotifyViewportChange(viewport, (camera) => onViewportChange(camera));
		return null;
	};
	const root = createRoot(document.createElement("div"));
	act(() => root.render(<Probe viewport={initialViewport} />));
	return {
		onViewportChange,
		rerender: (nextViewport: Viewport) =>
			act(() => root.render(<Probe viewport={nextViewport} />)),
		unmount: () => act(() => root.unmount()),
	};
};

describe("useNotifyViewportChange", () => {
	it("does not report the camera it mounts with", () => {
		const { onViewportChange, unmount } = renderHook();
		expect(onViewportChange).not.toHaveBeenCalled();
		unmount();
	});

	it("reports a pan and a zoom with the camera fields only", () => {
		const { onViewportChange, rerender, unmount } = renderHook();
		rerender({ ...initialViewport, minX: 10, minY: -5 });
		rerender({ ...initialViewport, minX: 10, minY: -5, zoom: 2 });
		expect(onViewportChange.mock.calls).toEqual([
			[{ minX: 10, minY: -5, zoom: 1 }],
			[{ minX: 10, minY: -5, zoom: 2 }],
		]);
		unmount();
	});

	it("stays quiet for a container resize and for a new viewport with the same camera", () => {
		const { onViewportChange, rerender, unmount } = renderHook();
		rerender({ ...initialViewport, width: 1024, height: 768 });
		rerender({ ...initialViewport });
		expect(onViewportChange).not.toHaveBeenCalled();
		unmount();
	});
});
