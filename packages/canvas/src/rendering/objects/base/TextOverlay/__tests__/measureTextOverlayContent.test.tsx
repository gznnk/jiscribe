// @vitest-environment jsdom

import { act, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { measureTextOverlayContent } from "../measureTextOverlayContent";

/**
 * jsdom lays nothing out, so the sizes here are what the stubbed reads return;
 * the drawn sizes are covered by the markdown plugin's e2e suite
 * (markdown-measure.spec.ts).
 */
// Set once for the whole file (as useIsTextLegible.test.tsx does) rather than
// inside the one test that needs act, so it is not left toggled for the rest.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("measureTextOverlayContent", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("reads the content element, inside the frame's foreignObject and wrapper", () => {
		vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
			function (this: HTMLElement) {
				// Only the content element (the wrapper's child) answers the real size.
				return this.parentElement?.parentElement?.tagName === "foreignObject"
					? new DOMRect(0, 0, 120.4, 33.6)
					: new DOMRect(0, 0, 999, 999);
			},
		);
		const size = measureTextOverlayContent({
			width: 120.4,
			height: 20,
			children: <div>body</div>,
		});
		expect(size).toEqual({ width: 120.4, height: 33.6 });
	});

	it("takes the scroll extent on an axis whose content overflows", () => {
		vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
			new DOMRect(0, 0, 100.4, 40),
		);
		vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(180);
		vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(100);
		const size = measureTextOverlayContent({
			width: 100.4,
			height: 40,
			children: "wide",
		});
		expect(size).toEqual({ width: 180, height: 40 });
	});

	it("names React's render or commit as the cause when called from an effect", () => {
		// React warns that flushSync cannot flush here; that is the case under test.
		vi.spyOn(console, "error").mockImplementation(() => {});
		let caught: unknown;
		const MeasureInEffect = () => {
			useLayoutEffect(() => {
				try {
					measureTextOverlayContent({ width: 50, height: 50, children: "x" });
				} catch (error) {
					caught = error;
				}
			}, []);
			return null;
		};
		const root = createRoot(document.createElement("div"));
		act(() => root.render(<MeasureInEffect />));
		act(() => root.unmount());
		expect(caught).toBeInstanceOf(Error);
		expect((caught as Error).message).toMatch(/rendering or committing/);
	});

	it("leaves nothing behind in the document", () => {
		const childCount = document.body.childElementCount;
		measureTextOverlayContent({ width: 50, height: 50, children: "x" });
		expect(document.body.childElementCount).toBe(childCount);
	});
});
