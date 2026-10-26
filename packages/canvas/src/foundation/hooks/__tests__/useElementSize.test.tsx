// @vitest-environment jsdom

import { act, useRef } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { type ElementSize, useElementSize } from "../useElementSize";

/**
 * What the hook promises is the measuring discipline: a size before the first
 * paint, a new one on every resize the observer reports, and the same object
 * (no render) when a report changes nothing.
 */

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

/** The observers the hook created, so a test can fire them as a resize would. */
let observerCallbacks: (() => void)[] = [];
let disconnectCount = 0;
let reportedSize = { width: 0, height: 0 };
const originalResizeObserver = globalThis.ResizeObserver;
const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

beforeEach(() => {
	observerCallbacks = [];
	disconnectCount = 0;
	reportedSize = { width: 48, height: 600 };
	globalThis.ResizeObserver = class {
		constructor(callback: () => void) {
			observerCallbacks.push(callback);
		}
		observe() {}
		unobserve() {}
		disconnect() {
			disconnectCount++;
		}
	} as unknown as typeof ResizeObserver;
	Element.prototype.getBoundingClientRect = () =>
		({ ...reportedSize }) as DOMRect;
});

afterEach(() => {
	globalThis.ResizeObserver = originalResizeObserver;
	Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
});

const renderProbe = () => {
	const sizes: (ElementSize | null)[] = [];
	const Probe = () => {
		const ref = useRef<HTMLDivElement>(null);
		sizes.push(useElementSize(ref));
		return <div ref={ref} />;
	};
	const root = createRoot(document.createElement("div"));
	act(() => root.render(<Probe />));
	return { sizes, unmount: () => act(() => root.unmount()) };
};

const fireResize = () =>
	act(() => {
		for (const callback of observerCallbacks) {
			callback();
		}
	});

describe("useElementSize", () => {
	it("measures in the layout effect, before anything is painted", () => {
		const { sizes, unmount } = renderProbe();
		expect(sizes[0]).toBeNull();
		expect(sizes[sizes.length - 1]).toEqual({ width: 48, height: 600 });
		unmount();
	});

	it("follows a resize the observer reports", () => {
		const { sizes, unmount } = renderProbe();
		reportedSize = { width: 48, height: 320 };
		fireResize();
		expect(sizes[sizes.length - 1]).toEqual({ width: 48, height: 320 });
		unmount();
	});

	it("renders nothing for a report that changes no dimension", () => {
		const { sizes, unmount } = renderProbe();
		const renderCount = sizes.length;
		fireResize();
		expect(sizes).toHaveLength(renderCount);
		unmount();
	});

	it("stops observing on unmount", () => {
		const { unmount } = renderProbe();
		unmount();
		expect(disconnectCount).toBe(1);
	});
});
