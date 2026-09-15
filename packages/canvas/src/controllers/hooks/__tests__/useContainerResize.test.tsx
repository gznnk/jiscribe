// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CanvasAction } from "../../reducer/CanvasActions";
import { useContainerResize } from "../useContainerResize";

/**
 * What the hook decides is *whether* a layout change is worth an action and what
 * `leftEdgeShift` it carries — the compensation arithmetic belongs to the
 * reducer. So these drive the container's box and its offset position by hand,
 * fire the two observers separately, and watch what reaches dispatch.
 */

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

/**
 * The container as the DOM would report it. `left` is null for an element with
 * no offset parent (display:none, a detached tree), which is what makes a shift
 * incomparable.
 */
type ContainerLayout = {
	width: number;
	height: number;
	left: number | null;
};

/** Callbacks of the ResizeObservers built while a test runs, newest last. */
type ResizeEntry = { contentRect: { width: number; height: number } };
let observerCallbacks: ((entries: ResizeEntry[]) => void)[] = [];

class ResizeObserverStub {
	constructor(callback: (entries: ResizeEntry[]) => void) {
		observerCallbacks.push(callback);
	}
	observe(): void {}
	unobserve(): void {}
	disconnect(): void {}
}

const roots: { unmount: () => void }[] = [];

/**
 * Mounts the hook on a container whose reported box is `initialLayout`, and
 * returns the dispatch spy plus the two ways the box can change: React
 * re-laying it out (a new `layoutKey`, as the sidebar's open flag does) and the
 * ResizeObserver reporting one after the paint.
 */
const mountWithLayout = (initialLayout: ContainerLayout) => {
	const dispatch = vi.fn<(action: CanvasAction) => void>();
	let layout = initialLayout;

	const container = document.createElement("div");
	container.getBoundingClientRect = () =>
		({ width: layout.width, height: layout.height }) as DOMRect;
	Object.defineProperty(container, "offsetLeft", {
		get: () => layout.left ?? 0,
	});
	Object.defineProperty(container, "offsetParent", {
		get: () => (layout.left === null ? null : document.body),
	});
	const containerRef = { current: container };

	const Probe = ({ layoutKey }: { layoutKey: unknown }) => {
		useContainerResize(containerRef, dispatch, layoutKey);
		return null;
	};

	let currentKey: unknown = false;
	const root = createRoot(document.createElement("div"));
	roots.push(root);
	const rerender = () => {
		act(() => {
			root.render(<Probe layoutKey={currentKey} />);
		});
	};
	rerender();

	return {
		dispatch,
		/** Re-renders with a new box under a new layoutKey, as opening the sidebar does. */
		relayout: (nextLayout: ContainerLayout, nextKey: unknown) => {
			layout = nextLayout;
			currentKey = nextKey;
			rerender();
		},
		/** Re-renders with a new layoutKey alone, the box unchanged. */
		rekey: (nextKey: unknown) => {
			currentKey = nextKey;
			rerender();
		},
		/** Delivers a ResizeObserver report of `size`, as the browser does after a paint. */
		reportResize: (size: { width: number; height: number }) => {
			act(() => {
				for (const callback of observerCallbacks) {
					callback([{ contentRect: size }]);
				}
			});
		},
	};
};

beforeEach(() => {
	observerCallbacks = [];
	vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

afterEach(() => {
	act(() => {
		roots.splice(0).forEach((root) => {
			root.unmount();
		});
	});
	vi.unstubAllGlobals();
});

describe("useContainerResize", () => {
	it("reports the size measured at mount, with nothing to compare the edge to", () => {
		const { dispatch } = mountWithLayout({
			width: 1000,
			height: 600,
			left: 0,
		});

		expect(dispatch).toHaveBeenCalledTimes(1);
		expect(dispatch).toHaveBeenCalledWith({
			type: "CONTAINER_RESIZE",
			dimensions: { width: 1000, height: 600 },
			leftEdgeShift: 0,
		});
	});

	it("does not dispatch when a layoutKey change moved nothing", () => {
		const { dispatch, rekey } = mountWithLayout({
			width: 1000,
			height: 600,
			left: 0,
		});
		expect(dispatch).toHaveBeenCalledTimes(1);

		rekey(true);

		expect(dispatch).toHaveBeenCalledTimes(1);
	});

	it("costs one action when both observers report the same box", () => {
		const { dispatch, reportResize } = mountWithLayout({
			width: 1000,
			height: 600,
			left: 0,
		});
		expect(dispatch).toHaveBeenCalledTimes(1);

		reportResize({ width: 1000, height: 600 });

		expect(dispatch).toHaveBeenCalledTimes(1);
	});

	it("reports the shift in both directions across an open/close round trip", () => {
		const { dispatch, relayout } = mountWithLayout({
			width: 1000,
			height: 600,
			left: 0,
		});

		relayout({ width: 752, height: 600, left: 248 }, true);
		relayout({ width: 1000, height: 600, left: 0 }, false);

		expect(dispatch).toHaveBeenCalledTimes(3);
		expect(dispatch.mock.calls[1][0]).toEqual({
			type: "CONTAINER_RESIZE",
			dimensions: { width: 752, height: 600 },
			leftEdgeShift: 248,
		});
		expect(dispatch.mock.calls[2][0]).toEqual({
			type: "CONTAINER_RESIZE",
			dimensions: { width: 1000, height: 600 },
			leftEdgeShift: -248,
		});
	});

	describe("when the container has no offset parent", () => {
		// Both measurements have to be comparable for a difference to mean a move,
		// so an unlaid-out container on either side of the change reports no shift
		// rather than a distance measured from 0.
		it("reports no shift when it was not laid out before the change", () => {
			const { dispatch, relayout } = mountWithLayout({
				width: 1000,
				height: 600,
				left: null,
			});

			relayout({ width: 752, height: 600, left: 248 }, true);

			expect(dispatch).toHaveBeenCalledTimes(2);
			expect(dispatch.mock.calls[1][0]).toEqual({
				type: "CONTAINER_RESIZE",
				dimensions: { width: 752, height: 600 },
				leftEdgeShift: 0,
			});
		});

		it("reports no shift when it is not laid out after the change", () => {
			const { dispatch, relayout } = mountWithLayout({
				width: 1000,
				height: 600,
				left: 0,
			});

			relayout({ width: 752, height: 600, left: null }, true);

			expect(dispatch).toHaveBeenCalledTimes(2);
			expect(dispatch.mock.calls[1][0]).toEqual({
				type: "CONTAINER_RESIZE",
				dimensions: { width: 752, height: 600 },
				leftEdgeShift: 0,
			});
		});
	});
});
